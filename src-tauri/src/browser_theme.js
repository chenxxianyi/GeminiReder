(() => {
  const baseTheme = `
    :root {
      color-scheme: dark !important;
      --zcode-page: #1e1e1e;
      --zcode-surface: #252526;
      --zcode-surface-raised: #2a2a2b;
      --zcode-border: #363638;
      --zcode-text: #d4d4d4;
      --zcode-muted: #929292;
      --zcode-link: #7aa2f7;
    }

    html,
    body {
      background-color: var(--zcode-page) !important;
    }

    html {
      scrollbar-color: #55555a #1e1e1e;
    }

    ::-webkit-scrollbar {
      width: 11px;
      height: 11px;
    }

    ::-webkit-scrollbar-track {
      background: #1e1e1e;
    }

    ::-webkit-scrollbar-thumb {
      background: #55555a;
      border: 3px solid #1e1e1e;
      border-radius: 999px;
    }

    ::-webkit-scrollbar-thumb:hover {
      background: #68686e;
    }
  `;

  const zhihuTheme = `
    body,
    button,
    input,
    textarea,
    select {
      color: var(--zcode-text) !important;
    }

    #root,
    .App-main,
    .Topstory,
    .Topstory-container,
    .QuestionPage,
    .Question-main,
    .Search-container,
    .SearchResult-Layout,
    .Profile-main,
    .Settings-main {
      background: var(--zcode-page) !important;
    }

    .AppHeader,
    .AppHeader-inner,
    .Card,
    .List,
    .List-item,
    .ContentItem,
    .TopstoryItem,
    .QuestionHeader,
    .QuestionHeader-content,
    .Question-mainColumn,
    .Question-sideColumn,
    .QuestionAnswer-content,
    .AnswerItem,
    .SearchBar-input,
    .Input-wrapper,
    .Popover-content,
    .Menu,
    .Modal-inner,
    .Comments-container,
    .CommentListV2,
    .CreatorEntrance,
    .GlobalWrite-navItem {
      color: var(--zcode-text) !important;
      background-color: var(--zcode-surface) !important;
      border-color: var(--zcode-border) !important;
      box-shadow: none !important;
    }

    .AppHeader,
    .QuestionHeader,
    .Card,
    .List-item,
    .ContentItem,
    .AnswerItem,
    .Comments-container,
    .CommentListV2 {
      border-color: var(--zcode-border) !important;
    }

    .ContentItem-title,
    .ContentItem-title a,
    .QuestionHeader-title,
    .QuestionHeader-title a,
    .RichText,
    .RichText p,
    .RichText span,
    .AuthorInfo-name,
    .AuthorInfo-name a,
    .AppHeader-TabsLink,
    .Popover-title,
    h1,
    h2,
    h3,
    h4,
    h5,
    h6 {
      color: var(--zcode-text) !important;
    }

    .ContentItem-meta,
    .ContentItem-time,
    .AuthorInfo-detail,
    .CommentItemV2-metaSibling,
    .SearchBar-input input::placeholder,
    .Input-wrapper input::placeholder {
      color: var(--zcode-muted) !important;
    }

    a,
    .Link,
    .RichContent-inner a,
    .ContentItem-more,
    .Button--link {
      color: var(--zcode-link) !important;
    }

    .Button:not(.Button--primary):not(.Button--blue) {
      color: #b9c7df !important;
      background-color: transparent !important;
      border-color: #465062 !important;
    }

    .Button--primary,
    .Button--blue {
      color: #ffffff !important;
    }

    input,
    textarea,
    select,
    [contenteditable='true'] {
      caret-color: var(--zcode-text) !important;
    }

    hr,
    [class*='Divider'] {
      border-color: var(--zcode-border) !important;
      background-color: var(--zcode-border) !important;
    }

    img,
    picture,
    video,
    canvas,
    svg {
      filter: none !important;
    }
  `;

  const zhihuAnswerTheme = `
    .AppHeader,
    .Question-sideColumn,
    .QuestionHeader-side,
    .QuestionHeader-footer,
    .Question-sideColumnAdContainer,
    .RelatedReadings,
    .QuestionRelatedReadings,
    .QuestionInvitation,
    .CreatorEntrance,
    .Pc-card,
    .Pc-word,
    .Pc-feedAd,
    .AdblockBanner,
    .Advertisement,
    .Advert,
    .CommercialQuestionTail,
    .Banner-link,
    .Footer,
    .CornerButtons,
    .GlobalSideBar,
    [class*='AdContainer'],
    [class*='Advertisement'],
    [class*='AdvertCard'],
    [class*='Commercial'],
    [data-za-detail-view-path-module='Ad'],
    [data-za-extra-module*='ad'],
    iframe[src*='ad'] {
      display: none !important;
    }

    html,
    body,
    #root,
    .App,
    .App-main,
    .QuestionPage {
      width: 100% !important;
      min-width: 0 !important;
      max-width: 100% !important;
      box-sizing: border-box !important;
    }

    html {
      overflow-x: auto !important;
    }

    body,
    #root,
    .App,
    .App-main,
    .QuestionPage {
      overflow-x: visible !important;
    }

    .QuestionPage *,
    .QuestionPage *::before,
    .QuestionPage *::after {
      box-sizing: border-box !important;
    }

    .App-main,
    .QuestionPage {
      min-width: 0 !important;
      padding-top: 0 !important;
      background: var(--zcode-page) !important;
    }

    .QuestionHeader {
      width: min(calc(100vw - 48px), 1080px) !important;
      max-width: calc(100vw - 48px) !important;
      margin: 20px auto 0 !important;
      overflow: hidden !important;
      background: var(--zcode-surface) !important;
      border: 1px solid var(--zcode-border) !important;
      border-radius: 10px !important;
    }

    .QuestionHeader-content,
    .QuestionHeader-main {
      width: 100% !important;
      min-width: 0 !important;
      max-width: 100% !important;
      box-sizing: border-box !important;
    }

    .QuestionHeader-content {
      padding: 22px 28px 20px !important;
    }

    .QuestionHeader-main {
      padding: 0 !important;
    }

    .QuestionHeader-title {
      margin: 0 !important;
      color: #e3e3e3 !important;
      font-size: 20px !important;
      font-weight: 650 !important;
      line-height: 1.45 !important;
      letter-spacing: 0.005em !important;
    }

    .QuestionHeader-detail,
    .QuestionHeader-topics {
      margin-top: 13px !important;
      color: var(--zcode-muted) !important;
    }

    .Question-main {
      display: block !important;
      width: min(calc(100vw - 48px), 1080px) !important;
      min-width: 0 !important;
      max-width: calc(100vw - 48px) !important;
      margin: 14px auto 0 !important;
      padding: 0 0 84px !important;
      overflow: visible !important;
    }

    .Question-mainColumn {
      width: 100% !important;
      min-width: 0 !important;
      max-width: 100% !important;
      margin: 0 !important;
    }

    .QuestionAnswers-answers,
    .QuestionAnswer-content,
    .List,
    .List-item,
    .AnswerItem {
      width: auto !important;
      min-width: 0 !important;
      max-width: 100% !important;
      margin-left: 0 !important;
      margin-right: 0 !important;
      box-sizing: border-box !important;
    }

    .QuestionAnswers-answers,
    .QuestionAnswer-content,
    .List {
      overflow: visible !important;
      background: transparent !important;
      border: 0 !important;
      box-shadow: none !important;
    }

    .List-header {
      min-height: 42px !important;
      padding: 0 18px !important;
      color: var(--zcode-muted) !important;
      background: var(--zcode-surface) !important;
      border: 1px solid var(--zcode-border) !important;
      border-radius: 8px !important;
    }

    .List-item,
    .AnswerItem {
      margin-top: 10px !important;
      padding: 24px 30px 18px !important;
      overflow: visible !important;
      background: var(--zcode-surface) !important;
      border: 1px solid var(--zcode-border) !important;
      border-radius: 9px !important;
      box-shadow: 0 10px 28px rgba(0, 0, 0, 0.18) !important;
    }

    .List-item + .List-item {
      margin-top: 12px !important;
    }

    .AuthorInfo {
      min-height: 42px !important;
      margin-bottom: 22px !important;
      padding-bottom: 16px !important;
      border-bottom: 1px solid var(--zcode-border) !important;
    }

    .AuthorInfo-avatar,
    .Avatar {
      border-radius: 7px !important;
    }

    .RichContent,
    .RichContent-inner,
    .RichText {
      width: auto !important;
      min-width: 0 !important;
      max-width: 100% !important;
      margin-left: 0 !important;
      margin-right: 0 !important;
      color: #d7d7d7 !important;
      font-size: 16px !important;
      line-height: 1.9 !important;
      letter-spacing: 0.012em !important;
      overflow-wrap: anywhere !important;
      word-break: break-word !important;
    }

    .RichText {
      white-space: normal !important;
    }

    .RichText p,
    .RichText li {
      min-width: 0 !important;
      max-width: 100% !important;
      white-space: normal !important;
      overflow-wrap: anywhere !important;
      word-break: break-word !important;
    }

    .RichText p {
      width: auto !important;
      margin: 0 0 1.15em !important;
    }

    .RichText blockquote {
      margin: 18px 0 !important;
      padding: 10px 16px !important;
      color: #b9b9b9 !important;
      background: #202124 !important;
      border-left: 3px solid #65799c !important;
    }

    .RichText pre,
    .RichText code {
      color: #c9d1d9 !important;
      background: #181a1f !important;
      border-color: #343944 !important;
      border-radius: 6px !important;
    }

    .RichText pre,
    .RichText table {
      width: auto !important;
      max-width: 100% !important;
      overflow-x: auto !important;
      overscroll-behavior-inline: contain !important;
    }

    .RichText table {
      display: block !important;
    }

    .RichText img,
    .RichText picture,
    .RichText video,
    .RichText canvas,
    .RichText figure,
    .RichText .VideoCard,
    .RichText .LinkCard,
    .RichText .ContentItem-image {
      width: auto !important;
      min-width: 0 !important;
      max-width: 100% !important;
      height: auto !important;
    }

    .ContentItem-actions,
    .ContentItem-actions.is-fixed {
      min-height: 48px !important;
      margin: 20px -30px -18px !important;
      padding: 7px 22px !important;
      color: var(--zcode-muted) !important;
      background: #222223 !important;
      border-top: 1px solid var(--zcode-border) !important;
      box-shadow: none !important;
    }

    .ContentItem-actions.is-fixed {
      position: sticky !important;
      bottom: 0 !important;
      width: auto !important;
      z-index: 10 !important;
    }

    .ContentItem-actions .Button {
      color: #aebbd0 !important;
    }

    .Comments-container,
    .CommentListV2 {
      margin-top: 14px !important;
      overflow: hidden !important;
      background: #222223 !important;
      border: 1px solid var(--zcode-border) !important;
      border-radius: 8px !important;
    }

    @media (max-width: 900px) {
      .QuestionHeader,
      .Question-main {
        width: calc(100vw - 24px) !important;
        max-width: calc(100vw - 24px) !important;
      }

      .QuestionHeader-content,
      .List-item,
      .AnswerItem {
        padding-left: 20px !important;
        padding-right: 20px !important;
      }

      .ContentItem-actions,
      .ContentItem-actions.is-fixed {
        margin-left: -20px !important;
        margin-right: -20px !important;
      }
    }
  `;

  const isZhihu = /(^|\.)zhihu\.com$/i.test(location.hostname);
  const isZhihuAnswer = isZhihu && /^\/question\/\d+(?:\/answer\/\d+)?\/?$/i.test(location.pathname);
  const css = baseTheme + (isZhihu ? zhihuTheme : '') + (isZhihuAnswer ? zhihuAnswerTheme : '');

  let themeInstalled = false;
  try {
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(css);
    document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
    themeInstalled = true;
  } catch (_) {
    // Older engines fall back to a regular style element below.
  }

  const installFallback = () => {
    if (document.getElementById('zcode-browser-theme')) return true;
    const parent = document.head || document.documentElement;
    if (!parent) return false;
    const style = document.createElement('style');
    style.id = 'zcode-browser-theme';
    style.textContent = css;
    parent.appendChild(style);
    return true;
  };

  if (!themeInstalled && !installFallback()) {
    const fallbackObserver = new MutationObserver(() => {
      if (installFallback()) fallbackObserver.disconnect();
    });
    fallbackObserver.observe(document, { childList: true, subtree: true });
  }

  if (isZhihuAnswer) {
    const fluidContainers = [
      '.QuestionAnswers-answers',
      '.QuestionAnswer-content',
      '.List',
      '.List-item',
      '.AnswerItem',
      '.RichContent',
      '.RichContent-inner',
      '.RichText'
    ].join(',');
    const flowingText = [
      '.RichText p',
      '.RichText div:not(.highlight)',
      '.RichText span',
      '.RichText li'
    ].join(',');

    const normalizeAnswerLayout = () => {
      document.documentElement.style.setProperty('min-width', '0', 'important');
      document.documentElement.style.setProperty('max-width', '100%', 'important');
      document.documentElement.style.setProperty('overflow-x', 'auto', 'important');
      document.body?.style.setProperty('min-width', '0', 'important');
      document.body?.style.setProperty('max-width', '100%', 'important');
      document.body?.style.setProperty('overflow-x', 'visible', 'important');

      document.querySelectorAll(fluidContainers).forEach((element) => {
        element.style.setProperty('width', 'auto', 'important');
        element.style.setProperty('min-width', '0', 'important');
        element.style.setProperty('max-width', '100%', 'important');
        element.style.setProperty('margin-left', '0', 'important');
        element.style.setProperty('margin-right', '0', 'important');
      });

      document.querySelectorAll(flowingText).forEach((element) => {
        if (element.closest('pre, code, .highlight')) return;
        element.style.setProperty('min-width', '0', 'important');
        element.style.setProperty('max-width', '100%', 'important');
        element.style.setProperty('white-space', 'normal', 'important');
        element.style.setProperty('overflow-wrap', 'anywhere', 'important');
        element.style.setProperty('word-break', 'break-word', 'important');
      });

      if (document.scrollingElement?.scrollLeft) {
        document.scrollingElement.scrollLeft = 0;
      }
    };

    let normalizationFrame = 0;
    const scheduleNormalization = () => {
      if (normalizationFrame) cancelAnimationFrame(normalizationFrame);
      normalizationFrame = requestAnimationFrame(() => {
        normalizationFrame = 0;
        normalizeAnswerLayout();
      });
    };

    scheduleNormalization();
    window.addEventListener('DOMContentLoaded', scheduleNormalization, { once: true });
    window.addEventListener('pageshow', scheduleNormalization);
    window.addEventListener('resize', scheduleNormalization);
    new MutationObserver(scheduleNormalization).observe(document, { childList: true, subtree: true });
  }
})();
