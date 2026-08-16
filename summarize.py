import json
import sys

def main():
    if len(sys.argv) < 2:
        print("Usage: summarize.py <summary.json>")
        sys.exit(1)

    path = sys.argv[1]
    try:
        with open(path, "r", encoding="utf-8") as f:
            d = json.load(f)
    except Exception as e:
        print(f"שגיאה בקריאת {path}: {e}")
        sys.exit(1)

    metrics = d.get("metrics", {})
    http_req = metrics.get("http_req_duration", {})
    reqs = metrics.get("http_reqs", {})
    failed = metrics.get("http_req_failed", {})

    print(f"- סה\"כ בקשות: {reqs.get('count', 'N/A')}")
    print(f"- זמן תגובה ממוצע: {http_req.get('avg', 'N/A')} ms")
    print(f"- p95: {http_req.get('p(95)', 'N/A')} ms")
    print(f"- אחוז כשלונות: {failed.get('rate', 'N/A')}")

if __name__ == "__main__":
    main()
