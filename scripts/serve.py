"""Optional local server. Python standard library only; no installation or build."""
import argparse
import functools
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import webbrowser

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Serve Field models locally')
    parser.add_argument('--port', type=int, default=8000)
    parser.add_argument('--no-open', action='store_true')
    args = parser.parse_args()
    root = Path(__file__).resolve().parent.parent
    SimpleHTTPRequestHandler.extensions_map.update({
        '.js': 'text/javascript', '.mjs': 'text/javascript',
        '.bin': 'application/octet-stream', '.wrl': 'model/vrml',
    })
    handler = functools.partial(SimpleHTTPRequestHandler, directory=str(root))
    try:
        server = ThreadingHTTPServer(('127.0.0.1', args.port), handler)
    except OSError:
        if args.port != 8000:
            raise
        server = ThreadingHTTPServer(('127.0.0.1', 0), handler)
    url = 'http://127.0.0.1:{}/'.format(server.server_port)
    print('Field models: {}\nPress Control-C to stop.'.format(url), flush=True)
    if not args.no_open:
        webbrowser.open(url)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
