let editorVisible = false;
let editor;
let observer;
let isSelectMode = false;
let selectedElements = [];
let treeView;

// 添加全局变量来存储原始 HTML
let originalHTML = '';
let currentHTML = ''; // 新增变量，用于存储当前显示的内容

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === "toggleEditor") {
    if (window.location.href.includes('/s/')) {
      if (!editorVisible) {
        createEditor();
      } else {
        removeEditor();
      }
      editorVisible = !editorVisible;
    } else {
      console.log('当前页面不是微信文章页面,无法启用编辑器');
      // 可以选择向用户发送一个通知
      chrome.runtime.sendMessage({action: "showNotification", message: "请在微信文章页面使用此功能"});
    }
  }
});

function loadCSS(url) {
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.type = 'text/css';
  link.href = chrome.runtime.getURL(url);
  document.head.appendChild(link);
}

function createEditor() {
  loadCSS('styles.css');
  
  editor = document.createElement('div');
  editor.id = 'wechat-content-editor';
  editor.innerHTML = `
    <div id="tree-view"></div>
    <div id="attributes-panel">
      <div id="style-attributes">
        <div class="attribute-title">样式属性</div>
        <div class="attribute-content"></div>
      </div>
      <div id="other-attributes">
        <div class="attribute-title">其他属性</div>
        <div class="attribute-content"></div>
      </div>
      <div id="animation-attributes" style="display: none;">
        <div class="attribute-title">动画属性</div>
        <div class="attribute-content"></div>
      </div>
    </div>
    <div id="content-area-container">
      <textarea id="content-area"></textarea>
    </div>
    <div class="button-container">
      <label id="simplify-html-label">
        <input type="checkbox" id="simplify-html-checkbox" checked>
        精简 HTML
      </label>
       <button id="extract-btn">提取全部内容</button>
       <button id="extract-selected-btn">提取选中内容</button>
      <button id="clear-selected-btn">清除选中</button>
      <button id="save-btn">保存</button>
      <button id="close-btn">关闭</button>
    </div>
  `;
  editor.style.cssText = `
    position: fixed;
    top: 10px;
    right: 10px;
    width: 400px;
    background: #2f3241;
    border: 1px solid #4a4d5e;
    padding: 10px;
    z-index: 10000;
    box-shadow: 0 0 10px rgba(0,0,0,0.3);
    font-family: Arial, sans-serif;
  `;
  document.body.appendChild(editor);
  
  treeView = document.getElementById('tree-view');
  
  document.getElementById('extract-btn').addEventListener('click', startContentExtraction);
  document.getElementById('extract-selected-btn').addEventListener('click', extractSelectedElements);
  document.getElementById('clear-selected-btn').addEventListener('click', clearSelectedElementsBtnFunction);
  document.getElementById('save-btn').addEventListener('click', saveContent);
  document.getElementById('close-btn').addEventListener('click', removeEditor);
  
  // 添加复选框的事件监听器
  const simplifyHtmlCheckbox = document.getElementById('simplify-html-checkbox');
  simplifyHtmlCheckbox.addEventListener('change', () => {
    updateContent();
    // 如果有选中的元素，更新属性面板
    if (selectedElements.length > 0) {
      updateAttributesPanel(selectedElements[selectedElements.length - 1]);
    }
  });
  
  console.log('编辑器已创建');
  startContentExtraction();
}

function toggleSelectMode() {
  isSelectMode = !isSelectMode;
  const selectModeBtn = document.getElementById('select-mode-btn');
  const extractSelectedBtn = document.getElementById('extract-selected-btn');
  const clearSelectedBtn = document.getElementById('clear-selected-btn');
  
  if (isSelectMode) {
    selectModeBtn.textContent = '退出选择模式';
    extractSelectedBtn.style.display = 'inline';
    clearSelectedBtn.style.display = 'inline';
    document.body.style.cursor = 'crosshair';
    document.addEventListener('mouseover', tempHighlightElement);
    document.addEventListener('mouseout', removeTempHighlight);
    document.addEventListener('click', selectElement);
  } else {
    selectModeBtn.textContent = '进入选择模式';
    extractSelectedBtn.style.display = 'none';
    clearSelectedBtn.style.display = 'none';
    document.body.style.cursor = 'default';
    document.removeEventListener('mouseover', tempHighlightElement);
    document.removeEventListener('mouseout', removeTempHighlight);
    document.removeEventListener('click', selectElement);
  }
}

function tempHighlightElement(e) {
  if (!isSelectMode) return;
  e.stopPropagation();
  e.target.style.outline = '2px solid red';
}

function removeTempHighlight(e) {
  if (!isSelectMode) return;
  e.stopPropagation();
  e.target.style.outline = '';
}

function selectElement(e) {
  if (!isSelectMode) return;
  e.preventDefault();
  e.stopPropagation();
  
  // 检查点击的元素是否在编辑器面板内
  if (editor.contains(e.target)) {
    return;
  }
  
  clearSelectedElements();
  selectedElements.push(e.target);
  highlightElement(e.target);
  updateTreeViewSelection(e.target);
  updateAttributesPanel(e.target);
}

function highlightElement(element) {
  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position: absolute;
    background-color: rgba(0, 255, 0, 0.3);
    pointer-events: none;
    z-index: 9999;
  `;
  const rect = element.getBoundingClientRect();
  overlay.style.left = `${rect.left + window.scrollX}px`;
  overlay.style.top = `${rect.top + window.scrollY}px`;
  overlay.style.width = `${rect.width}px`;
  overlay.style.height = `${rect.height}px`;
  document.body.appendChild(overlay);
  element.dataset.overlayId = overlay.id = `overlay-${Date.now()}`;
}

function updateTreeViewSelection(element) {
  const treeNodes = treeView.getElementsByTagName('span');
  for (let node of treeNodes) {
    if (node.textContent === getElementDescription(element)) {
      node.style.backgroundColor = 'yellow';
      node.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      break;
    }
  }
}

function clearSelectedElementsBtnFunction(){
  // 重新提取内容 
  startContentExtraction();
  startContentExtraction();
}

function clearSelectedElements() {
  selectedElements.forEach(element => {
    const overlay = document.getElementById(element.dataset.overlayId);
    if (overlay) overlay.remove();
  });
  selectedElements = [];
  
  const treeNodes = treeView.getElementsByTagName('span');
  for (let node of treeNodes) {
    node.style.backgroundColor = '';
  }
  
}

function extractSelectedElements() {
  if (selectedElements.length === 0) {
    alert('请先选择要提取的元素');
    return;
  }
  
  currentHTML = ''; // 清空当前内容
  selectedElements.forEach(element => {
    currentHTML += element.outerHTML + '\n';
  });
  
  updateContent();
  console.log('选中的内容已提取');
}

function analyzePage() {
  console.log('开始分析页面...');
  const contentArea = document.getElementById('content-area');
  
  let analysis = '页面分析结果：\n\n';
  
  // 检查 js_content 元素
  const jsContent = document.getElementById('js_content');
  analysis += `js_content 元素: ${jsContent ? '存在' : '不存在'}\n`;
  
  // 检查 rich_media_content 类
  const richMediaContent = document.getElementsByClassName('rich_media_content');
  analysis += `rich_media_content 类元素: ${richMediaContent.length}个\n`;
  
  // 检查组合选择器
  const combinedSelector = document.querySelector('div#js_content.rich_media_content');
  analysis += `组合选择器匹配元素: ${combinedSelector ? '存在' : '不存在'}\n`;
  
  // 列出所有 id 包含 content 的元素
  const contentIds = Array.from(document.querySelectorAll('[id*="content"]'))
    .map(el => el.id);
  analysis += `ID 包含 "content" 的元: ${contentIds.join(', ')}\n`;
  
  // 列出所有 class 包含 content 的元素
  const contentClasses = Array.from(document.querySelectorAll('[class*="content"]'))
    .map(el => el.className);
  analysis += `Class 包 "content" 的元素: ${contentClasses.join(', ')}\n`;
  
  contentArea.value = analysis;
  console.log(analysis);
}

function startContentExtraction() {
  console.log('开始提取内容...');
  const articleContent = document.querySelector('div#js_content.rich_media_content');
  if (articleContent) {
    try {
      extractContent(articleContent);
      createTreeView(articleContent);
      enableSelectionMode();
      console.log('内容提取和树状视图创建完成');
    } catch (error) {
      console.error('提取内容或创建树状视图时出错:', error);
      alert('提取内容或创建树状视图时出错，请查看控制台以获取详细信息。');
    }
  } else {
    console.error('未找到文章内容元素');
    alert('未找到文章内容元素，请确保您在微信公众号文章页面上。');
  }
}

function enableSelectionMode() {
  document.body.style.cursor = 'crosshair';
  document.addEventListener('mouseover', tempHighlightElement);
  document.addEventListener('mouseout', removeTempHighlight);
  document.addEventListener('click', selectElement);
}

function extractContent(element) {
  console.log('开始提取内容...');
  
  originalHTML = element.innerHTML;
  currentHTML = originalHTML; // 初始化 currentHTML
  console.log('原始内容长度:', originalHTML.length);

  // 处理背景图片
  const elementsWithBackgroundImage = element.querySelectorAll('[style*="background-image"], [data-lazy-bgimg]');
  console.log(`找到的背景图片元素数量: ${elementsWithBackgroundImage.length}`);

  elementsWithBackgroundImage.forEach((el, index) => {
    console.log(`处理第 ${index + 1} 个背景图片元素:`);
    const lazyBgImg = el.getAttribute('data-lazy-bgimg');
    if (lazyBgImg) {
      console.log('找到 data-lazy-bgimg:', lazyBgImg);
      el.style.backgroundImage = `url('${lazyBgImg}')`;
      el.removeAttribute('data-lazy-bgimg');
    } else {
      console.log('没有找到 data-lazy-bgimg，保留原始背景图片');
    }
  });

  // 处理 <img> 标签
  const imgElements = element.querySelectorAll('img[data-src]');
  console.log(`找到的延迟加载 img 元素数量: ${imgElements.length}`);

  imgElements.forEach((img, index) => {
    console.log(`处理第 ${index + 1} 个 img 元素:`);
    const dataSrc = img.getAttribute('data-src');
    if (dataSrc) {
      console.log('找到 data-src:', dataSrc);
      img.src = dataSrc;
      img.removeAttribute('data-src');
      
      // 移除占位符 SVG
      if (img.src.startsWith('data:image/svg+xml')) {
        img.src = dataSrc;
      }
      
      // 处理其他可能的延迟加载属性
      ['data-ratio', 'data-w', 'data-type', 'data-s'].forEach(attr => {
        img.removeAttribute(attr);
      });
      
      // 恢复原始样式
      const originalStyle = img.getAttribute('data-original-style');
      if (originalStyle) {
        img.style = originalStyle;
        img.removeAttribute('data-original-style');
      }
    } else {
      console.log('没有找到 data-src，保留原始 src');
    }
  });

  updateContent();
  
  console.log('文章内容已成功提取并放入文本区域');
}

function updateContent() {
  const contentArea = document.getElementById('content-area');
  const simplifyHtmlCheckbox = document.getElementById('simplify-html-checkbox');
  
  if (simplifyHtmlCheckbox.checked) {
    contentArea.value = formatHTML(simplifyHTML(currentHTML));
  } else {
    contentArea.value = formatHTML(currentHTML);
  }

  // 如果有选中的元素，更新属性面板
  if (selectedElements.length > 0) {
    updateAttributesPanel(selectedElements[selectedElements.length - 1]);
  }
}

function simplifyHTML(html) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  
  function processElement(element) {
    console.log('Processing element:', element.tagName, element.className);
    
    // 检查并移除特定属性
    const attributesToRemove = ['powered-by', 'label', 'copyright', 'cr'];
    attributesToRemove.forEach(attr => {
      if (element.hasAttribute(attr)) {
        element.removeAttribute(attr);
      }
    });

    // 移除所有 data- 属性
    Array.from(element.attributes).forEach(attr => {
      if (attr.name.startsWith('data-')) {
        element.removeAttribute(attr.name);
      }
    });
    
    // 递归处理子元素
    Array.from(element.children).forEach(child => processElement(child));
  }
  
  // 从文档的 body 开始处理
  processElement(doc.body);
  
  // 使用 formatHTML 函数来格式化简化后的 HTML
  return formatHTML(doc.body.innerHTML);
}

function formatHTML(html) {
  let formatted = '';
  let indent = 0;
  const tab = '  '; // 两个空格作为缩
  
  html.split(/>\s*</).forEach(element => {
    if (element.match(/^\/\w/)) {
      indent = Math.max(0, indent - 1); // 确保 indent 不会小于 0
    }
    
    formatted += tab.repeat(Math.max(0, indent)) + '<' + element + '>\r\n';
    
    if (element.match(/^<?\w[^>]*[^\/]$/) && !element.startsWith("input")) {
      indent += 1;
    }
  });
  
  return formatted.substring(1, formatted.length - 3);
}

function createTreeView(element) {
  try {
    if (!treeView) {
      console.error('Tree view element not found');
      return;
    }
    treeView.innerHTML = '';
    const tree = document.createElement('ul');
    tree.style.listStyleType = 'none';
    tree.style.paddingLeft = '0';
    createTreeNode(element, tree);
    treeView.appendChild(tree);
  } catch (error) {
    console.error('Error creating tree view:', error);
    alert('创建树状视图时出错，请查看控制台以获取详细信息。');
  }
}

function createTreeNode(element, parentNode, level = 0) {
  try {
    const li = document.createElement('li');
    li.style.paddingLeft = `${5}px`; // 每级固定缩进 5px
    const span = document.createElement('span');
    span.textContent = getElementDescription(element);
    span.style.cursor = 'pointer';
    span.addEventListener('click', () => selectTreeNode(element, span));

    // 检查是否直接包含动画元素
    const hasAnimation = checkForDirectAnimation(element);
    if (hasAnimation) {
      const animationIcon = document.createElement('span');
      animationIcon.textContent = '🎬'; // 使用电影摄像机 emoji 作为动画图标
      animationIcon.title = '包含动画元素';
      animationIcon.style.marginRight = '5px';
      li.insertBefore(animationIcon, li.firstChild);
    }

    // 检查是否为图片元素或包含背景图片
    const hasImage = checkForImage(element);
    if (hasImage) {
      const imageIcon = document.createElement('span');
      imageIcon.textContent = '🖼️'; // 使用图 emoji 作为图片图标
      imageIcon.title = '包含图片';
      imageIcon.style.marginRight = '5px';
      li.insertBefore(imageIcon, li.firstChild);
    }

    li.appendChild(span);

    if (element.children.length > 0) {
      const ul = document.createElement('ul');
      ul.style.display = 'none';  // 初始状态为折叠
      ul.style.listStyleType = 'none';
      ul.style.paddingLeft = '0';
      Array.from(element.children).forEach(child => createTreeNode(child, ul, level + 1));
      li.appendChild(ul);

      const toggleBtn = document.createElement('span');
      toggleBtn.textContent = '▶';
      toggleBtn.style.marginRight = '3px';
      toggleBtn.style.cursor = 'pointer';
      toggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleTreeNode(toggleBtn, ul);
      });
      li.insertBefore(toggleBtn, li.firstChild);
    }

    parentNode.appendChild(li);
  } catch (error) {
    console.error('Error creating tree node:', error);
  }
}

function checkForDirectAnimation(element) {
  // 只检查直接子元素
  for (let child of element.children) {
    if (child.tagName.toLowerCase() === 'animatetransform' || 
        child.tagName.toLowerCase() === 'animate') {
      return true;
    }
  }
  return false;
}

function checkForImage(element) {
  // 检查是否为 img 标签或有 data-src 属性
  if (element.tagName.toLowerCase() === 'img' || element.hasAttribute('data-src')) {
    return true;
  }

  // 检查是否有背景图片或 data-lazy-bgimg 属性
  const style = window.getComputedStyle(element);
  const backgroundImage = style.getPropertyValue('background-image');
  if (backgroundImage && backgroundImage !== 'none' || element.hasAttribute('data-lazy-bgimg')) {
    return true;
  }

  return false;
}

function getElementDescription(element) {
  let desc = element.tagName.toLowerCase();
  if (element.id) desc += `#${element.id}`;
  if (element.className && typeof element.className === 'string') {
    desc += `.${element.className.trim().replace(/\s+/g, '.')}`;
  } else if (element.classList && element.classList.length) {
    desc += `.${Array.from(element.classList).join('.')}`;
  }
  
  // 添加简化的 name 属性显示
  const name = element.getAttribute('name');
  if (name) {
    desc += `@${name}`;
  }
  
  return desc;
}

function toggleTreeNode(toggleBtn, ul) {
  if (ul.style.display === 'none') {
    ul.style.display = 'block';
    toggleBtn.textContent = '▼';
  } else {
    ul.style.display = 'none';
    toggleBtn.textContent = '▶';
  }
}

function selectTreeNode(element, span) {
  clearSelectedElements();
  selectedElements.push(element);
  span.style.backgroundColor = 'yellow';
  highlightElement(element);
  updateAttributesPanel(element);
  //提取选中内容
  extractSelectedElements();
}

function updateAttributesPanel(element) {
  const styleAttributes = document.querySelector('#style-attributes .attribute-content');
  const otherAttributes = document.querySelector('#other-attributes .attribute-content');
  const animationAttributes = document.querySelector('#animation-attributes .attribute-content');
  const simplifyHtmlCheckbox = document.getElementById('simplify-html-checkbox');

  // 更新样式属性
  styleAttributes.innerHTML = '';
  const styles = element.style;
  for (let i = 0; i < styles.length; i++) {
    const prop = styles[i];
    const value = styles.getPropertyValue(prop);
    if (prop === 'background-image') {
      const url = value.replace(/url\(['"]?(.*?)['"]?\)/, '$1');
      styleAttributes.innerHTML += `
        <span class="attribute-item">
          <span class="attribute-name">${prop}:</span>
          <span class="attribute-value">${value}</span>
          <img src="${url}" class="thumbnail" alt="Background Image">
        </span>
      `;
    } else {
      styleAttributes.innerHTML += `
        <span class="attribute-item">
          <span class="attribute-name">${prop}:</span>
          <span class="attribute-value">${value}</span>
        </span>
      `;
    }
  }

  // 更新其他属性
  otherAttributes.innerHTML = '';
  for (let attr of element.attributes) {
    if (attr.name !== 'style') {
      if (simplifyHtmlCheckbox.checked && 
          (attr.name.startsWith('data-') || 
           ['powered-by', 'label', 'copyright', 'cr'].includes(attr.name))) {
        continue;
      }
      if (attr.name === 'src' && element.tagName.toLowerCase() === 'img') {
        otherAttributes.innerHTML += `
          <span class="attribute-item">
            <span class="attribute-name">${attr.name}:</span>
            <span class="attribute-value">${attr.value}</span>
            <img src="${attr.value}" class="thumbnail" alt="Image">
          </span>
        `;
      } else {
        otherAttributes.innerHTML += `
          <span class="attribute-item">
            <span class="attribute-name">${attr.name}:</span>
            <span class="attribute-value">${attr.value}</span>
          </span>
        `;
      }
    }
  }

  // 更新动画属性
  const animationPanel = document.getElementById('animation-attributes');
  const hasAnimation = checkForDirectAnimation(element);
  
  if (hasAnimation) {
    animationPanel.style.display = 'block';
    animationAttributes.innerHTML = '';
    
    const animationElements = Array.from(element.children).filter(child => 
      child.tagName.toLowerCase() === 'animate' || child.tagName.toLowerCase() === 'animatetransform'
    );

    animationElements.forEach(animElement => {
      const animType = animElement.tagName.toLowerCase();
      const attributeName = animElement.getAttribute('attributeName');
      const type = animElement.getAttribute('type'); // 新增：获取变换类型
      const values = animElement.getAttribute('values');
      const keyTimes = animElement.getAttribute('keyTimes');
      const dur = animElement.getAttribute('dur');
      const begin = animElement.getAttribute('begin') || 'null';
      const fill = animElement.getAttribute('fill') || 'null';
      const restart = animElement.getAttribute('restart') || 'null';
      const repeatCount = animElement.getAttribute('repeatCount') || 'null';
      const calcMode = animElement.getAttribute('calcMode') || 'null';
      const keySplines = animElement.getAttribute('keySplines') || 'null';

      let animationDescription = '';
      if (values) {
        const valueArray = values.split(';');
        if (keyTimes) {
          const keyTimeArray = keyTimes.split(';');
          const durSeconds = parseFloat(dur);
          animationDescription = valueArray.map((value, index) => {
            const time = keyTimeArray[index] ? parseFloat(keyTimeArray[index]) * durSeconds : index * (durSeconds / (valueArray.length - 1));
            return `${value} 在 ${time.toFixed(2)}s`;
          }).join(' → ');
        } else {
          animationDescription = valueArray.join(' → ');
        }
      }

      animationAttributes.innerHTML += `
        <div class="animation-item">
          <h4>${animType === 'animate' ? '基础动画' : '变换动画'}</h4>
          <span class="attribute-item">
            <span class="attribute-name">属性名:</span>
            <span class="attribute-value">${attributeName}${type ? ` (${type})` : ''}</span>
          </span>
          <span class="attribute-item">
            <span class="attribute-name">动画过程:</span>
            <span class="attribute-value">${animationDescription}</span>
          </span>
          <span class="attribute-item">
            <span class="attribute-name">持续时间:</span>
            <span class="attribute-value">${dur}</span>
          </span>
          <span class="attribute-item">
            <span class="attribute-name">开始时间:</span>
            <span class="attribute-value">${begin}</span>
          </span>
          <span class="attribute-item">
            <span class="attribute-name">填充模式:</span>
            <span class="attribute-value">${fill}</span>
          </span>
          <span class="attribute-item">
            <span class="attribute-name">重启行为:</span>
            <span class="attribute-value">${restart}</span>
          </span>
          <span class="attribute-item">
            <span class="attribute-name">重复次数:</span>
            <span class="attribute-value">${repeatCount}</span>
          </span>
          <span class="attribute-item">
            <span class="attribute-name">计算模式:</span>
            <span class="attribute-value">${calcMode}</span>
          </span>
          ${keySplines !== 'null' ? `
          <span class="attribute-item">
            <span class="attribute-name">关键样条:</span>
            <span class="attribute-value">${keySplines}</span>
          </span>
          ` : ''}
        </div>
      `;
    });
  } else {
    animationPanel.style.display = 'none';
  }

  // 添加缩略图的鼠标悬停效果
  const thumbnails = document.querySelectorAll('.thumbnail');
  thumbnails.forEach(thumbnail => {
    thumbnail.addEventListener('mouseover', showPreview);
    thumbnail.addEventListener('mouseout', hidePreview);
  });
}

function showPreview(event) {
  const preview = document.createElement('div');
  preview.className = 'preview';
  preview.innerHTML = `<img src="${event.target.src}" alt="Preview">`;
  document.body.appendChild(preview);

  // 设置预览图的位置
  const rect = event.target.getBoundingClientRect();
  preview.style.position = 'fixed';
  preview.style.left = `${rect.right + 10}px`;
  preview.style.top = `${rect.top}px`;
  preview.style.zIndex = '10000';
}

function hidePreview() {
  const preview = document.querySelector('.preview');
  if (preview) {
    preview.remove();
  }
}

function saveContent() {
  console.log('开始保存内容...');
  
  const content = document.getElementById('content-area').value;
  
  if (!content) {
    console.error('没有内容可以保存');
    alert('没有内容可以保存，先提取文章内容。');
    return;
  }

  console.log('要保存的内容长度:', content.length);

  // 获取公众号名称
  const nicknameElement = document.querySelector('#js_name');
  const nickname = nicknameElement ? nicknameElement.textContent.trim() : '未知公众号';

  // 获取文章标题
  const titleElement = document.querySelector('title');
  const title = titleElement ? titleElement.textContent.trim() : '未知标题';

  const fullHTML = `
    <div id="article-content">
    ${content}
    </div>
  `;
  
  const blob = new Blob([fullHTML], {type: 'text/html;charset=utf-8'});
  const downloadLink = document.createElement('a');
  downloadLink.href = URL.createObjectURL(blob);
  
  const today = new Date();
  const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  
  // 创建文件名
  let fileName = `${nickname}_${title}_${dateStr}.html`;
  // 移除文件名中的非法字符
  fileName = fileName.replace(/[<>:"/\\|?*]/g, '_');
  // 限制文件名长度
  if (fileName.length > 255) {
    fileName = fileName.substring(0, 251) + '.html';
  }
  
  downloadLink.download = fileName;
  
  document.body.appendChild(downloadLink);
  downloadLink.click();
  document.body.removeChild(downloadLink);
  
  URL.revokeObjectURL(downloadLink.href);
  
  console.log(`内容已保存为 ${fileName}，保存内容长度：${fullHTML.length}`);
}

function removeEditor() {
  if (editor) {
    document.body.removeChild(editor);
    editor = null;
  }
  clearSelectedElements();
  document.body.style.cursor = 'default';
  document.removeEventListener('mouseover', tempHighlightElement);
  document.removeEventListener('mouseout', removeTempHighlight);
  document.removeEventListener('click', selectElement);
}

// 将初始化代码替换为以下内容:
function initializeIfNeeded() {
  if (window.location.href.includes('/s/')) {
    console.log('URL 包含 "/s/", 正在初始化编辑器...');
    // createEditor();
  } else {
    console.log('URL 不包含 "/s/", 不初始化编辑器');
  }
}

// 在 DOMContentLoaded 事件中调用初始化函数
document.addEventListener('DOMContentLoaded', initializeIfNeeded);

// 监听 URL 变化
let lastUrl = location.href; 
new MutationObserver(() => {
  const url = location.href;
  if (url !== lastUrl) {
    lastUrl = url;
    initializeIfNeeded();
  }
}).observe(document, {subtree: true, childList: true});

