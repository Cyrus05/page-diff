<html>

<head>
  <title>diff</title>
  <meta charset="utf-8">
  <style>
    html {
      height: 100%;
    }

    body {
      font-family: Consolas, monospace;
      font-size: 14px;
      height: 100%;
      margin: 0;
    }

    .container {
      height: 100%;
      overflow: auto;
      padding: 24px 24px 24px 84px;
      box-sizing: border-box;
      position: relative;
    }

    .diff-bar {
      position: fixed;
      left: 0;
      top: 0;
      width: 60px;
      height: 100%;
      background-color: black;
      z-index: 99;
    }

    .diff-bar .item {
      position: absolute;
      left: 0;
      width: 100%;
      min-height: 1px;
      cursor: pointer;
    }

    .diff-bar .item:hover {
      outline: 1px solid white;
    }

    .diff-bar .item.added {
      background-color: rgba(0, 255, 0, 0.5);
    }

    .diff-bar .item.removed {
      background-color: rgba(255, 0, 0, 0.5);
    }


    .content {
      white-space: pre;
    }

    .content .focus {
      position: relative;
    }

    .content .focus::after {
      position: absolute;
      content: '';
      left: 0;
      top: 0;
      width: 100%;
      height: 100%;
      animation: focus 0.5s;
    }

    @keyframes focus {
      0% {
        transform: scale(5);
        opacity: 1;
        border: 1px solid green;
      }

      100% {
        transform: scale(1);
        opacity: 0;
      }
    }
  </style>
</head>

<body>
  <div class="container">
    <div class="diff-bar"></div>
    <div class="content">{{ content }}</div>
  </div>

  <script>
    const diffBarItems = [];
    const contentHeight = document.querySelector('.content').clientHeight;
    document.querySelectorAll('[data-added], [data-removed]').forEach(el => {
      const position = el.getBoundingClientRect();
      const offsetTopPercentage = position.top / contentHeight * 100 + '%';
      const heightPercentage = position.height / contentHeight * 100 + '%';
      const className = el.matches('[data-added]') ? 'item added' : 'item removed';

      diffBarItems.push(`<a class="${className}" href="#${el.id}" style="top:${offsetTopPercentage}; height:${heightPercentage}"></a>`)
    });

    const diffBar = document.querySelector('.diff-bar')
    diffBar.innerHTML = diffBarItems.join('');
    diffBar.addEventListener('click', e => {
      e.preventDefault();
      const targetSelector = e.target.getAttribute('href');
      if (targetSelector) {
        const target = document.querySelector(targetSelector);
        target.scrollIntoView({
          block: 'center',
          inline: 'center'
        });
        target.classList.add('focus');
        setTimeout(() => target.classList.remove('focus'), 1000);
      }
    })
  </script>
</body>
</html>