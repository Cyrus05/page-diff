# page diff
A toolset for comparing the UI and HTML structure of two pages.

## setup
### 1. install packages
```shell
yarn install
```

## pages comparing
### UI comparing
```shell
# diff from urls
yarn diff https://test.com/my-page-1 https://test.com/my-page-2

# diff in desktop/tablet/mobile
yarn diff:all https://test.com/my-page-1 https://test.com/my-page-2

# diff in tablet only
yarn diff:tablet https://test.com/my-page-1 https://test.com/my-page-2

# diff in mobile only
yarn diff:mobile https://test.com/my-page-1 https://test.com/my-page-2

# diff with custome screen size
SCREEN_SIZE="800x600" yarn diff https://test.com/my-page-1 https://test.com/my-page-2

# diff from local pngs
yarn diff test1.png test2.png

# or mixed
yarn diff test1.png https://test.com/my-page-2
```

### HTML structure comparing
```shell
yarn html-diff https://test.com/my-page-1 https://test.com/my-page-2
```

## Diff for logined pages
Assign the session cookies to the env variables in `.env` file, `COOKIE1` is for the first url, `COOKIE2` is for the second url.

The cookie format: `key1=value1;key2=value2;...`, e.g.
```
COOKIE1="session-token=xxxxx;a=b"
COOKIE2="session-token=xxxxx;c=d"
```
