import inspect
import ollama
print(ollama.chat)
print(ollama.Client)
cli = ollama.Client(base_url='http://localhost:11434')
print(cli)
from ollama._types import ChatResponse
print('ChatResponse attrs', [a for a in dir(ChatResponse) if not a.startswith('_')][:80])
print('ChatResponse repr', ChatResponse)
