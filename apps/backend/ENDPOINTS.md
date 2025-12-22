# Exercise endpoints (draft)

Planned FastAPI routes to support the exercise playground UI. These are stubs; implementations should be added alongside request/response schemas and worker orchestration.

## Base URL

- `${API_BASE_URL}` (defaults to `http://localhost:8000`)

## Endpoints

### POST `/exercises/generate`

- **Purpose:** Request a new coding exercise from the LLM and persist it.
- **Request body:**
  ```json
  {
    "topic": "strings",
    "difficulty": "easy", // easy | medium | hard
    "language": "python"
  }
  ```
- **Response:**
  ```json
  {
    "id": "uuid",
    "title": "Count vowels",
    "difficulty": "easy",
    "prompt_markdown": "### Goal ...",
    "starter_code": "def solution(...): ..."
  }
  ```

### POST `/exercises/{exercise_id}/run`

- **Purpose:** Run learner code in a sandbox and return stdout/stderr.
- **Request body:**
  ```json
  {
    "code": "def solution(...): ...",
    "language": "python"
  }
  ```
- **Response:**
  ```json
  {
    "stdout": "Execution output",
    "stderr": "",
    "duration_ms": 1200
  }
  ```

### POST `/exercises/{exercise_id}/submit`

- **Purpose:** Submit final solution, run tests, and record result.
- **Request body:**
  ```json
  {
    "code": "def solution(...): ...",
    "language": "python"
  }
  ```
- **Response:**
  ```json
  {
    "status": "passed", // passed | failed
    "score": 1.0,
    "stdout": "All tests passed",
    "stderr": "",
    "details": {
      "tests_run": 5,
      "tests_failed": 0
    }
  }
  ```

### GET `/exercises/{exercise_id}`

- **Purpose:** Retrieve a stored exercise prompt and starter code.
- **Response:**
  ```json
  {
    "id": "uuid",
    "title": "Count vowels",
    "difficulty": "easy",
    "prompt_markdown": "### Goal ...",
    "starter_code": "def solution(...): ..."
  }
  ```

### POST `/chat/ask`

- **Purpose:** Send a message to the LLM assistant for help with the current exercise. Supports streaming responses and maintains conversation context.
- **Request body:**
  ```json
  {
    "message": "How do I approach this problem?",
    "exercise_id": "uuid",
    "conversation_history": [
      {
        "role": "user",
        "content": "Can you give me a hint?"
      },
      {
        "role": "assistant",
        "content": "Sure! Try using a set to track..."
      }
    ]
  }
  ```
- **Response:** Server-Sent Events (text/event-stream)
  ```
  data: {"type": "message", "content": "You can solve this..."}
  data: {"type": "message", "content": " by iterating through..."}
  data: {"type": "done"}
  ```

### POST `/chat/ask/batch`

- **Purpose:** Non-streaming variant of `/chat/ask` for simpler implementations.
- **Request body:** Same as `/chat/ask`
- **Response:**
  ```json
  {
    "response": "Full response text from the assistant",
    "tokens_used": 150
  }
  ```
