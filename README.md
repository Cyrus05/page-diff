# page diff
A toolset for comparing the UI and HTML structure of two pages.

## setup
```
yarn install
```

## pages comparing
### UI comparing
```shell
# diff from urls
yarn diff https://test.com/my-page-1 https://test.com/my-page-2

# diff from local pngs
yarn diff test1.png test2.png

# or mixed
yarn diff test1.png https://test.com/my-page-2
```

### HTML structure comparing
```shell
yarn html-diff https://test.com/my-page-1 https://test.com/my-page-2
```