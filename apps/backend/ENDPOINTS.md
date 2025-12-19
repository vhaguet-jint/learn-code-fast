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
