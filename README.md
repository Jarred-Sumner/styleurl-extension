# StyleURL Extension

StyleURL is the easiest way for developers & designers to collaborate on CSS changes. 

## Export CSS from Chrome

Make style changes from Chrome Inspector, and StyleURL will show you the diff of your CSS changes in the page. 

Before StyleURL, to get your CSS tweaks out of Chrome DevTools, you had to select each element, remember what you changed, and copy it to a file. Now, StyleURL will automatically detect all of your changes and show you the diff.

## Save to Gist

StyleURL integrates with GitHub Gists so that you can save and share your CSS changes easily.

## Preview live changes from a link

Add `?__styleurl=gist_${gistID}` to the URL on a webpage, and it'll automatically load the CSS from the Gist onto that page (so long as there's a matching Stylefile).

## Stylefile - an open standard for user style metadata

StyleURL is not the primary storage place for the userstyles. They're currently stored on GitHub as a Gist (more providers could easily be added later). This reduces the dependence of any centralized party for StyleURL to work, giving people better control of their data.

Example Stylefile:
```yaml
---
version: 1.0 # Optional
domains: # Required
- news.ycombinator.com
url_patterns: # Required
- news.ycombinator.com/*
timestamp: '2018-07-27T04:21:42Z' # Optional
id: 6GJP # Optional, not currently used
redirect_url: https://news.ycombinator.com/ # Required
shared_via: StyleURL – import and export CSS changes from Chrome Inspector to a Gist
  you can share (like this one!) # Optional
```

StyleURL generates and uses a Stylefile to:
- Detect which pages a StyleURL should be applied to (`url_patterns`)
- Detect which domains a StyleURL correspond to (`domains`)
- When activated from a different page, which absolute URL to redirect to (`redirect_url`)

Under the hood, the way this works is:
- Given a StyleURL, the extension fetches the corresponding Gist, reads the Stylefile, and if the URL matches the current URL, downloads the stylesheets within the Gist and applies them to the current page.

### Development

You'll want to point it to production and make sure chrome://flags/#allow-insecure-localhost is enabled (TODO more words)
