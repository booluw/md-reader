# XSS fixture

Benign lead-in with a [javascript: link](javascript:alert('md-link')).

## Raw HTML payloads

<img src="x" onerror="alert('img-onerror')">

<svg onload="alert('svg-onload')"></svg>

<iframe src="javascript:alert('iframe-src')"></iframe>

<a href="javascript:alert('anchor')">javascript anchor</a>

<a href="vbscript:alert('vbscript')">vbscript anchor</a>

<script>alert('script-tag')</script>

<style>body { display: none; }</style>

<img src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" alt="data uri pixel">

## Second section

Fenced code stays inert:

```js
alert('fenced code')
```

End of fixture.
