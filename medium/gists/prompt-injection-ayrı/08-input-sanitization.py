import re

# Prompt Injection Input Sanitization

dangerous_patterns = [
    r"ignore\s+(previous|all|above)\s+instructions",
    r"you\s+are\s+now\s+",
    r"pretend\s+to\s+be",
    r"forget\s+(everything|all|previous)",
    r"reveal\s+(your|the)\s+(instructions|prompt)",
]

def sanitize_input(user_input: str) -> str:
    """
    Kullanıcı girdisini potansiyel prompt injection 
    saldırılarına karşı kontrol eder.
    """
    for pattern in dangerous_patterns:
        if re.search(pattern, user_input, re.IGNORECASE):
            raise SecurityException("Potential injection detected")
    return user_input
