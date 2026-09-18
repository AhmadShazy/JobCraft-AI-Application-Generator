import backend.ai_client as ai


def test_classify_quota():
    assert ai._classify(Exception("429 Too Many Requests: quota_exceeded")) == "quota"
    assert ai._classify(Exception("RESOURCE_EXHAUSTED")) == "quota"


def test_classify_not_found_before_unavailable():
    # A 404/not-found must not be misread as a transient availability error.
    assert ai._classify(Exception("404 model gemini-x not found")) == "not_found"
    assert ai._classify(Exception("model is not supported")) == "not_found"


def test_classify_unavailable():
    assert ai._classify(Exception("503 Service Unavailable, overloaded")) == "unavailable"
    assert ai._classify(Exception("deadline exceeded")) == "unavailable"


def test_classify_hard():
    assert ai._classify(Exception("API key invalid")) == "hard"


def test_clean_json_response_strips_fences_and_trailing_commas():
    raw = '```json\n{"a": 1, "b": [1, 2,],}\n```'
    import json
    assert json.loads(ai.clean_json_response(raw)) == {"a": 1, "b": [1, 2]}
