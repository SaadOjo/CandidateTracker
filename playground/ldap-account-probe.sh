#!/usr/bin/env bash
set -euo pipefail

# Temporary LDAP/Active Directory account probe.
# Prompts for credentials, discovers the AD base DN, then prints selected user attributes.
# Usage:
#   ./scripts/ldap-account-probe.sh
#   ./scripts/ldap-account-probe.sh 26058536
#   LDAP_BIND_USER='TOKENINC\26063413' ./scripts/ldap-account-probe.sh 26058536
# The password is written only to a chmod 600 temp file for ldapsearch -y and removed on exit.

LDAP_HOSTS="${LDAP_HOSTS:-10.40.100.101 10.40.100.102}"
LDAP_SCHEME="${LDAP_SCHEME:-ldap}"
LDAP_PORT="${LDAP_PORT:-389}"
LDAP_STARTTLS="${LDAP_STARTTLS:-0}"
LDAP_BASE_DN="${LDAP_BASE_DN:-}"
LDAP_DEFAULT_DOMAIN_NETBIOS="${LDAP_DEFAULT_DOMAIN_NETBIOS:-TOKENINC}"
LDAP_DEFAULT_UPN_SUFFIX="${LDAP_DEFAULT_UPN_SUFFIX:-tokeninc.com}"
LDAP_BIND_USER="${LDAP_BIND_USER:-}"
LDAP_SEARCH_USER="${LDAP_SEARCH_USER:-}"
LDAP_OUTPUT_FORMAT="${LDAP_OUTPUT_FORMAT:-parsed}"

usage() {
  cat <<'EOF'
Usage:
  scripts/ldap-account-probe.sh [user-to-search]

Environment overrides:
  LDAP_BIND_USER              Username used to bind/authenticate.
  LDAP_SEARCH_USER            Username/mail/UPN to search. Positional argument wins if provided.
  LDAP_HOSTS                  Space-separated LDAP hosts. Default: 10.40.100.101 10.40.100.102
  LDAP_SCHEME                 ldap or ldaps. Default: ldap
  LDAP_PORT                   Default: 389
  LDAP_STARTTLS               Set to 1 to use StartTLS.
  LDAP_BASE_DN                Optional search base. Auto-discovered if omitted.
  LDAP_DEFAULT_DOMAIN_NETBIOS Default: TOKENINC
  LDAP_DEFAULT_UPN_SUFFIX     Default: tokeninc.com
  LDAP_OUTPUT_FORMAT          parsed or raw. Default: parsed

Examples:
  scripts/ldap-account-probe.sh
  scripts/ldap-account-probe.sh 26058536
  LDAP_BIND_USER='TOKENINC\26063413' scripts/ldap-account-probe.sh 26058536
  LDAP_OUTPUT_FORMAT=raw scripts/ldap-account-probe.sh 26058536
EOF
}

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
  usage
  exit 0
fi

if [[ $# -gt 1 ]]; then
  usage >&2
  exit 1
fi

if [[ $# -eq 1 ]]; then
  LDAP_SEARCH_USER="$1"
fi

if ! command -v ldapsearch >/dev/null 2>&1; then
  echo "ldapsearch is not installed or is not on PATH." >&2
  exit 1
fi

if [[ -z "$LDAP_BIND_USER" ]]; then
  read -r -p "LDAP username / bind user: " LDAP_BIND_USER
fi

if [[ -z "$LDAP_SEARCH_USER" ]]; then
  LDAP_SEARCH_USER="${LDAP_BIND_USER#*\\}"
  LDAP_SEARCH_USER="${LDAP_SEARCH_USER%@*}"
  read -r -p "User to search [$LDAP_SEARCH_USER]: " typed_search_user
  LDAP_SEARCH_USER="${typed_search_user:-$LDAP_SEARCH_USER}"
fi

read -r -s -p "LDAP password: " LDAP_PASSWORD
echo

password_file="$(mktemp)"
chmod 600 "$password_file"
trap 'rm -f "$password_file"' EXIT
printf '%s' "$LDAP_PASSWORD" > "$password_file"
unset LDAP_PASSWORD

ldap_filter_escape() {
  local value="$1"
  value="${value//\\/\\5c}"
  value="${value//\*/\\2a}"
  value="${value//\(/\\28}"
  value="${value//\)/\\29}"
  printf '%s' "$value"
}

ldap_args() {
  local host="$1"
  printf '%s\n' -LLL -x -H "${LDAP_SCHEME}://${host}:${LDAP_PORT}" -D "$LDAP_BIND_USER" -y "$password_file"
  if [[ "$LDAP_STARTTLS" == "1" ]]; then
    printf '%s\n' -ZZ
  fi
}

run_ldapsearch() {
  local host="$1"
  shift
  local args=()
  while IFS= read -r arg; do
    args+=("$arg")
  done < <(ldap_args "$host")
  ldapsearch "${args[@]}" "$@"
}

parse_ldif() {
  perl -MMIME::Base64=decode_base64 -MEncode=decode -MPOSIX=strftime -0777 -e '
    binmode STDIN;
    binmode STDOUT, ":encoding(UTF-8)";

    sub as_text {
      my ($value) = @_;
      return decode("UTF-8", $value, Encode::FB_PERLQQ);
    }

    sub ad_time {
      my ($value) = @_;
      return "" if !defined($value) || $value eq "";
      return "never" if $value eq "0" || $value eq "9223372036854775807";
      my $seconds = int($value / 10000000) - 11644473600;
      return $value if $seconds <= 0;
      return strftime("%Y-%m-%d %H:%M:%S UTC", gmtime($seconds));
    }

    sub uac_status {
      my ($value) = @_;
      return "" if !defined($value) || $value eq "";
      my @flags;
      push @flags, (($value & 2) ? "disabled" : "enabled");
      push @flags, "password-not-required" if $value & 32;
      push @flags, "password-cannot-change" if $value & 64;
      push @flags, "normal-account" if $value & 512;
      push @flags, "password-never-expires" if $value & 65536;
      push @flags, "smartcard-required" if $value & 262144;
      push @flags, "trusted-for-delegation" if $value & 524288;
      push @flags, "password-expired" if $value & 8388608;
      return "$value (" . join(", ", @flags) . ")";
    }

    sub first {
      my ($entry, $key) = @_;
      return "" if !exists $entry->{$key} || !@{$entry->{$key}};
      return $entry->{$key}[0];
    }

    sub cn_from_dn {
      my ($dn) = @_;
      return "" if !defined($dn) || $dn eq "";
      if ($dn =~ /^CN=((?:\\\\.|[^,])+),/) {
        my $cn = $1;
        $cn =~ s/\\\\([,=+<>#;"\\\\])/$1/g;
        return $cn;
      }
      return $dn;
    }

    my $input = <STDIN>;
    my @physical = split /\r?\n/, $input;
    my @lines;
    for my $line (@physical) {
      if ($line =~ /^ / && @lines) {
        $lines[-1] .= substr($line, 1);
      } else {
        push @lines, $line;
      }
    }

    my @entries;
    my %current;
    for my $line (@lines) {
      next if $line =~ /^#/;
      if ($line eq "") {
        push @entries, { %current } if %current;
        %current = ();
        next;
      }

      if ($line =~ /^([^:]+)::\s*(.*)$/) {
        push @{$current{$1}}, as_text(decode_base64($2));
      } elsif ($line =~ /^([^:]+):\s*(.*)$/) {
        push @{$current{$1}}, as_text($2);
      }
    }
    push @entries, { %current } if %current;
    @entries = grep { exists $_->{dn} } @entries;

    if (!@entries) {
      print "No LDAP entry found.\n";
      exit 0;
    }

    for my $i (0 .. $#entries) {
      my $entry = $entries[$i];
      print "\n" if $i > 0;
      print "Entry " . ($i + 1) . "\n" if @entries > 1;
      print "Identity\n";
      print "  Display name: " . first($entry, "displayName") . "\n";
      print "  Given name: " . first($entry, "givenName") . "\n";
      print "  Surname: " . first($entry, "sn") . "\n";
      print "  Common name: " . first($entry, "cn") . "\n";
      print "  Username: " . first($entry, "sAMAccountName") . "\n";
      print "  UPN: " . first($entry, "userPrincipalName") . "\n";
      print "  DN: " . first($entry, "dn") . "\n";

      print "\nOrganization\n";
      print "  Title: " . first($entry, "title") . "\n";
      print "  Department: " . first($entry, "department") . "\n";
      print "  Company: " . first($entry, "company") . "\n";
      print "  Manager: " . cn_from_dn(first($entry, "manager")) . "\n";

      print "\nContact\n";
      print "  Email: " . first($entry, "mail") . "\n";
      print "  Phone: " . first($entry, "telephoneNumber") . "\n";
      print "  Mobile: " . first($entry, "mobile") . "\n";

      print "\nAccount\n";
      print "  User account control: " . uac_status(first($entry, "userAccountControl")) . "\n";
      print "  Account expires: " . ad_time(first($entry, "accountExpires")) . "\n";
      print "  Password last set: " . ad_time(first($entry, "pwdLastSet")) . "\n";
      print "  Last logon timestamp: " . ad_time(first($entry, "lastLogonTimestamp")) . "\n";

      my @groups = exists $entry->{memberOf} ? @{$entry->{memberOf}} : ();
      print "\nGroups (" . scalar(@groups) . ")\n";
      if (@groups) {
        for my $group (@groups) {
          print "  - " . cn_from_dn($group) . "\n";
        }
      } else {
        print "  none returned\n";
      }
    }
  '
}

selected_host=""
selected_bind_user=""
root_dse=""
bind_candidates=("$LDAP_BIND_USER")

if [[ "$LDAP_BIND_USER" != *\\* && "$LDAP_BIND_USER" != *@* ]]; then
  bind_candidates+=("${LDAP_DEFAULT_DOMAIN_NETBIOS}\\${LDAP_BIND_USER}")
  bind_candidates+=("${LDAP_BIND_USER}@${LDAP_DEFAULT_UPN_SUFFIX}")
fi

for bind_user in "${bind_candidates[@]}"; do
  LDAP_BIND_USER="$bind_user"
  for host in $LDAP_HOSTS; do
    if root_dse="$(run_ldapsearch "$host" -s base -b "" defaultNamingContext namingContexts 2>/dev/null)"; then
      selected_host="$host"
      selected_bind_user="$bind_user"
      break 2
    fi
  done
done

if [[ -z "$selected_host" ]]; then
  echo "Could not bind to any configured LDAP host: $LDAP_HOSTS" >&2
  echo "Check VPN, username format, password, host, port, and whether LDAPS/StartTLS is required." >&2
  exit 1
fi

if [[ -z "$LDAP_BASE_DN" ]]; then
  LDAP_BASE_DN="$(
    printf '%s\n' "$root_dse" |
      awk -F': ' '/^defaultNamingContext: / { print $2; exit } /^namingContexts: / { print $2; exit }'
  )"
fi

if [[ -z "$LDAP_BASE_DN" ]]; then
  echo "Bind succeeded on $selected_host, but base DN could not be discovered." >&2
  echo "Re-run with LDAP_BASE_DN set, for example: LDAP_BASE_DN='DC=example,DC=com' $0" >&2
  exit 1
fi

account_name="$LDAP_SEARCH_USER"
account_name="${account_name#*\\}"
account_name="${account_name%@*}"

escaped_search_user="$(ldap_filter_escape "$LDAP_SEARCH_USER")"
escaped_account_name="$(ldap_filter_escape "$account_name")"
filter="(|(sAMAccountName=${escaped_account_name})(userPrincipalName=${escaped_search_user})(mail=${escaped_search_user}))"

result="$(
  run_ldapsearch "$selected_host" \
  -b "$LDAP_BASE_DN" \
  -s sub \
  "$filter" \
  dn \
  cn \
  displayName \
  givenName \
  sn \
  mail \
  userPrincipalName \
  sAMAccountName \
  title \
  department \
  company \
  manager \
  memberOf \
  telephoneNumber \
  mobile \
  userAccountControl \
  accountExpires \
  pwdLastSet \
  lastLogonTimestamp
)"

echo "Connection"
echo "  Host: $selected_host"
echo "  Bind user used: $selected_bind_user"
echo "  Base DN: $LDAP_BASE_DN"
echo "  Search filter: $filter"

if [[ "$LDAP_OUTPUT_FORMAT" == "raw" ]]; then
  echo
  printf '%s\n' "$result"
elif [[ "$LDAP_OUTPUT_FORMAT" == "parsed" ]]; then
  printf '%s\n' "$result" | parse_ldif
else
  echo "Unknown LDAP_OUTPUT_FORMAT: $LDAP_OUTPUT_FORMAT. Expected parsed or raw." >&2
  exit 1
fi
