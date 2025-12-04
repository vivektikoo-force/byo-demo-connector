# Sample Post Participant Payloads

## Post Participant payload

- Participant Payload: The expected payload is a valid JSON array of participants as shown below.
```jsonc
[
  {
    "appType": "agent",
    "subject": "Participant Record ID", // Record ID of participant to be removed
    "role": "Agent"
  }
]
```

> [!NOTE]  
> The Remove operation for POST Participants only supports an array of 1 participant

[back](/README.md)
