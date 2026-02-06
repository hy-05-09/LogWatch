export const SAMPLE_LOW = `{
  "request_id": "demo-low",
  "logs": [
    {
      "event_id": "e-low-1",
      "ts": "2026-02-03T10:00:00Z",
      "actor": { "user_id": "u123" },
      "action": "LOGIN",
      "result": "SUCCESS",
      "source": { "ip": "203.0.113.10", "country": "KR", "device_id": "dev-a" },
      "target": { "resource": "auth", "sensitivity": "LOW" }
    }
  ],
  "context": {
    "baseline": {
      "known_countries": ["KR"],
      "known_devices": ["dev-a"],
      "typical_login_hours": [9, 10, 11, 12, 13, 14, 15, 16, 17]
    }
  }
}`;

export const SAMPLE_MED = `{
  "request_id": "demo-med",
  "logs": [
    {
      "event_id": "e-med-1",
      "ts": "2026-02-03T10:00:10Z",
      "actor": { "user_id": "u123" },
      "action": "LOGIN",
      "result": "FAIL",
      "source": { "ip": "203.0.113.10", "country": "KR", "device_id": "dev-a" },
      "target": { "resource": "auth", "sensitivity": "LOW" }
    },
    {
      "event_id": "e-med-2",
      "ts": "2026-02-03T10:01:10Z",
      "actor": { "user_id": "u123" },
      "action": "LOGIN",
      "result": "FAIL",
      "source": { "ip": "203.0.113.10", "country": "KR", "device_id": "dev-a" },
      "target": { "resource": "auth", "sensitivity": "LOW" }
    },
    {
      "event_id": "e-med-3",
      "ts": "2026-02-03T10:02:10Z",
      "actor": { "user_id": "u123" },
      "action": "LOGIN",
      "result": "FAIL",
      "source": { "ip": "203.0.113.10", "country": "KR", "device_id": "dev-a" },
      "target": { "resource": "auth", "sensitivity": "LOW" }
    }
  ],
  "context": {
    "baseline": {
      "known_countries": ["KR"],
      "known_devices": ["dev-a"],
      "typical_login_hours": [9, 10, 11, 12, 13, 14, 15, 16, 17]
    }
  }
}`;

export const SAMPLE_HIGH = `{
  "request_id": "demo-high",
  "logs": [
    {
      "event_id": "e-high-1",
      "ts": "2026-02-03T01:00:10Z",
      "actor": { "user_id": "u123" },
      "action": "LOGIN",
      "result": "FAIL",
      "source": { "ip": "198.51.100.10", "country": "US", "device_id": "dev-x" },
      "target": { "resource": "auth", "sensitivity": "LOW" }
    },
    {
      "event_id": "e-high-2",
      "ts": "2026-02-03T01:01:10Z",
      "actor": { "user_id": "u123" },
      "action": "LOGIN",
      "result": "FAIL",
      "source": { "ip": "198.51.100.10", "country": "US", "device_id": "dev-x" },
      "target": { "resource": "auth", "sensitivity": "LOW" }
    },
    {
      "event_id": "e-high-3",
      "ts": "2026-02-03T01:02:10Z",
      "actor": { "user_id": "u123" },
      "action": "LOGIN",
      "result": "FAIL",
      "source": { "ip": "198.51.100.10", "country": "US", "device_id": "dev-x" },
      "target": { "resource": "auth", "sensitivity": "LOW" }
    },
    {
      "event_id": "e-high-4",
      "ts": "2026-02-03T01:03:10Z",
      "actor": { "user_id": "u123" },
      "action": "LOGIN",
      "result": "FAIL",
      "source": { "ip": "198.51.100.10", "country": "US", "device_id": "dev-x" },
      "target": { "resource": "auth", "sensitivity": "LOW" }
    }
  ],
  "context": {
    "baseline": {
      "known_countries": ["KR"],
      "known_devices": ["dev-a"]
    }
  }
}`;
