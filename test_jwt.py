import jwt
import datetime
from datetime import timezone

# Create a test JWT token
payload = {
    "email": "test@example.com",
    "name": "Test User",
    "sub": "test-user-id",
    "exp": datetime.datetime.now(timezone.utc) + datetime.timedelta(days=7)
}

# Try a simple secret key for testing
secret_key = "test-secret-key"
token = jwt.encode(payload, secret_key, algorithm="HS256")

print(f"Test JWT Token: {token}")
