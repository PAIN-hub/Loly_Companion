#!/usr/bin/env python3
"""
Loly / Coucou Cross-Platform Agent Hook Script (Python)
Works seamlessly on Windows, Linux, and macOS.

Usage:
  python3 coucou-hook.py --agent claude-code --title "Running linter" --target "npm run lint"
  python3 coucou-hook.py --agent gemini-cli --title "Database Migration" --target "alembic upgrade head" --sync
"""

import sys
import json
import argparse
import urllib.request
import urllib.error

def main():
    parser = argparse.ArgumentParser(description="Send agent event hook to Loly")
    parser.add_argument("--agent", default="gemini-cli", help="Agent name identifier")
    parser.add_argument("--title", default="Agent Step", help="Short step summary")
    parser.add_argument("--target", default="", help="Command, file, or question target")
    parser.add_argument("--type", default="command", help="Event type: command, file_edit, question")
    parser.add_argument("--sync", action="store_true", help="Wait for user Allow/Deny decision")
    parser.add_argument("--url", default="http://127.0.0.1:4141", help="Loly server endpoint")
    args = parser.parse_args()

    endpoint = f"{args.url}/api/hook/sync" if args.sync else f"{args.url}/api/hook"
    payload = {
        "coucou_agent": args.agent,
        "action_type": args.type,
        "title": args.title,
        "target": args.target,
        "requires_approval": args.sync
    }

    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(endpoint, data=data, headers={"Content-Type": "application/json"})

    try:
        if args.sync:
            print(f"[Loly Hook] Waiting for user approval on screen for: {args.target or args.title}...")
        with urllib.request.urlopen(req, timeout=120) as res:
            res_body = json.loads(res.read().decode("utf-8"))
            if args.sync:
                decision = res_body.get("decision", "allow")
                print(f"[Loly Hook] User Decision: {decision.upper()}")
                if decision in ["deny", "timeout"]:
                    sys.exit(1)
            else:
                print(f"[Loly Hook] Event sent successfully.")
    except urllib.error.URLError as e:
        print(f"[Loly Hook Warning] Could not reach Loly server ({e}). Continuing.")
    except Exception as e:
        print(f"[Loly Hook Error] {e}")

if __name__ == "__main__":
    main()
