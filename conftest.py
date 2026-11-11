from __future__ import annotations

import os
import sys

os.environ.setdefault("WEBHOOK_SECRET", "whyline_test_webhook_secret_local")


def _install_windows_iocp_self_pipe_patch() -> None:
    """Replaces BaseProactorEventLoop TCP loopback socketpair self-pipe with direct IOCP
    PostQueuedCompletionStatus wakeup so Starlette TestClient / anyio BlockingPortal
    never deadlocks in socket._fallback_socketpair on Windows Python 3.14 sandboxes.
    """
    if sys.platform != "win32":
        return
    try:
        import _overlapped
        import asyncio.proactor_events as pe
        import asyncio.windows_events as we

        if getattr(pe.BaseProactorEventLoop, "_whyline_iocp_patched", False):
            return

        class _DummyPipeSocket:
            def fileno(self) -> int:
                return -1

            def close(self) -> None:
                pass

            def setblocking(self, flag: bool) -> None:
                pass

        def _make_self_pipe(self) -> None:
            self._ssock = _DummyPipeSocket()
            self._csock = _DummyPipeSocket()
            self._internal_fds += 1

        def _close_self_pipe(self) -> None:
            if getattr(self, "_self_reading_future", None) is not None:
                self._self_reading_future.cancel()
                self._self_reading_future = None
            self._ssock = None
            self._csock = None
            self._internal_fds -= 1

        def _write_to_self(self) -> None:
            proactor = getattr(self, "_proactor", None)
            iocp = getattr(proactor, "_iocp", None) if proactor is not None else None
            if iocp is not None:
                try:
                    _overlapped.PostQueuedCompletionStatus(iocp, 0, 0, 1)
                except OSError:
                    pass

        def _loop_self_reading(self, f=None) -> None:
            return None

        pe.BaseProactorEventLoop._make_self_pipe = _make_self_pipe
        pe.BaseProactorEventLoop._close_self_pipe = _close_self_pipe
        pe.BaseProactorEventLoop._write_to_self = _write_to_self
        we.ProactorEventLoop._loop_self_reading = _loop_self_reading
        pe.BaseProactorEventLoop._whyline_iocp_patched = True
    except Exception:
        pass


_install_windows_iocp_self_pipe_patch()
