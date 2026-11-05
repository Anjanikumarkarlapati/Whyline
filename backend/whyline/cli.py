#!/usr/bin/env python3
"""WhyLine CLI entrypoint.

Allows running:
    python -m backend.whyline.cli check <diff>
    whyline check <diff>
"""
import sys
from pathlib import Path

# Ensure workspace root is in sys.path
root_dir = Path(__file__).resolve().parent.parent.parent
if str(root_dir) not in sys.path:
    sys.path.insert(0, str(root_dir))

from backend.whyline.cli_and_hooks import main

if __name__ == "__main__":
    main()
