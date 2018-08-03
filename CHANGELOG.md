## 1.1.12

Fixed issue where navigating around in Reddit sometimes caused a giant diff to appear of changes on the page. This happened because Reddit uses `<style>` which are empty in the DOM, but with rules populated via `insertRule` - https://developer.mozilla.org/en-US/docs/Web/API/CSSStyleSheet/insertRule

It just so happens that these style tags are not editable from within devtools anyway.

## 1.1.11

- On some websites, the code diff text was centered. It should be left aligned. So, I made it left-aligned.

## 1.1.10

- Automatically hide the bottom bar when there are no more CSS changes
- Include whether in-app feedback is from the view styleurl or the create styleurl bar

## 1.1.9

- Fixed flash of unstyled content when the bar at the bottom loads
- Added in-app feedback widget to help us improve the product, inspired by the one in the Stripe Dashboard.

## 1.1.8

Bump version of `stylesheet-differ`. This fixes some bugs people were experiencing when viewing the diff.

## 1.1.7

- Hide Intercom **only** when the StyleURL bar is visible in the page because it covers up StyleURL and, for now, it's easier to forcefully hide it than to move it to be above the bar. TODO: observe for the `#intercom-container` selector instead of inserting a style tag when bar appears
- Add a spacer div to handle a good amount of cases where the bottom of screen is covered up by StyleURL. This won't fix every case, particularly websites like Facebook where the bottom of the screen is something else that's floaty

## 1.1.6

- Add "Share StyleURL" link to GitHub Gist
- Show error message when devtools isn't open and the user clicks "Share" or "Create Gist"

## 1.1.5

Ignore error causd by tab to not exist when resetting browserAction. This caused other things to break, and is a safe error to silence (famous last words)

## 1.1.4

Fix bug caused in 1.1.3 where the redirect URL was the share URL

## 1.1.3

Fix "Share changes" button on HTTP-only sites

## 1.1.2

Remove console.\*(^[error|log]) in production

## 1.1.1

Remove query string from exported filenames because that's usually just a way to deal with caching and not how filenames are in the filesystem.

## 1.1.0

Improve performance of memoizer slightly

## 1.0.9

Fix issue where stylesheets after page changes on the same tab were being diffed. For example, you'd open Hacker News, edit some styles, click on a link to a page, then it would show all the Hacker News styles being `unset`.

Now, it clears all the cached styles on `chrome.webNavigation.onCommitted`.

Additionally:

- Made the <CodeDiff /> box 400px wide instead of 320px.
- Made the filenames use "\_" instead of "!" as the replacement character when a character is invalid. For example, before `news.css!asodKPODSAKDPOK.css` and after `news.css_COKASODK.css`

## 1.0.8

Update stylesheet-differ to the latest version, fixing a bad bug.

## 1.0.7

Performance improvements and bug fixes

## 1.0.6

Bump version.

## 1.0.5

Bump version.

## 1.0.4

Bump version.

## 1.0.3

Bump version.

## 1.0.2

Initial Release.
