
from Gemini.gemini_service import (
    test_gemini_connection,
    MODEL_NAME,
)


def main():
    print("Testing Gemini connection...")
    print(f"Model: {MODEL_NAME}")

    answer = test_gemini_connection()

    print("\nGemini response:")
    print(answer)

    print("\nGemini connection successful!")


if __name__ == "__main__":
    main()
