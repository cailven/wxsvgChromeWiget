let editorVisible = false;
let editor;
let observer;
let isSelectMode = false;
let selectedElements = [];
let treeView;

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === "toggleEditor") {
    if (!editorVisible) {
      createEditor();
    } else {
      removeEditor();
    }
    editorVisible = !editorVisible;
  }
});

function createEditor() {
  editor = document.createElement('div');
  editor.id = 'wechat-content-editor';
  editor.innerHTML = `
    <style>
      #wechat-content-editor {
        background-color: #2f3241;
        color: #ffffff;
        display: flex;
        flex-direction: column;
        height: 90vh;
        max-height: 900px;
      }
      #tree-view {
        flex: 1;
        overflow: auto;
        border: 1px solid #4a4d5e;
        margin-bottom: 10px;
        padding: 10px;
        background-color: #383c4a;
        font-family: Arial, sans-serif;
        font-size: 14px;
      }
      #tree-view ul {
        list-style-type: none;
        padding-left: 20px;
      }
      #tree-view li {
        margin: 5px 0;
      }
      #tree-view span {
        cursor: pointer;
        padding: 2px 5px;
        border-radius: 3px;
      }
      #tree-view span:hover {
        background-color: #4a4d5e;
      }
      #tree-view .selected {
        background-color: #5294e2;
      }
      #content-area {
        height: 200px;
        margin-bottom: 10px;
        font-family: monospace;
        font-size: 12px;
        background-color: #383c4a;
        color: #ffffff;
        border: 1px solid #4a4d5e;
        resize: vertical;
      }
      .button-container {
        display: flex;
        flex-wrap: wrap;
        gap: 5px;
      }
      button {
        margin-right: 5px;
        margin-bottom: 5px;
        padding: 5px 10px;
        font-size: 14px;
        background-color: #5294e2;
        color: #ffffff;
        border: none;
        border-radius: 3px;
        cursor: pointer;
      }
      button:hover {
        background-color: #4a85d1;
      }
      .checkbox-container {
        display: flex;
        align-items: center;
        margin-bottom: 10px;
      }
      .checkbox-container input {
        margin-right: 5px;
      }
    </style>
    <div id="tree-view"></div>
    <div class="checkbox-container">
      <input type="checkbox" id="simplify-html" />
      <label for="simplify-html">精简 HTML 结构</label>
    </div>
    <textarea id="content-area"></textarea>
    <div class="button-container">
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
  document.getElementById('clear-selected-btn').addEventListener('click', clearSelectedElements);
  document.getElementById('save-btn').addEventListener('click', saveContent);
  document.getElementById('close-btn').addEventListener('click', removeEditor);
  
  console.log('编辑器已创建');
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
  
  let extractedContent = '';
  selectedElements.forEach(element => {
    extractedContent += element.outerHTML + '\n';
  });
  
  const contentArea = document.getElementById('content-area');
  contentArea.value = formatHTML(extractedContent);
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
  analysis += `ID 包含 "content" 的元素: ${contentIds.join(', ')}\n`;
  
  // 列出所有 class 包含 content 的元素
  const contentClasses = Array.from(document.querySelectorAll('[class*="content"]'))
    .map(el => el.className);
  analysis += `Class 包含 "content" 的元素: ${contentClasses.join(', ')}\n`;
  
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
  
  let contentHTML = element.innerHTML;
  console.log('原始内容长度:', contentHTML.length);

  // 处理背景图片
  const elementsWithBackgroundImage = element.querySelectorAll('[style*="background-image"]');
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

  // 重新获取处理后的 HTML
  contentHTML = element.innerHTML;
  console.log('处理后的内容长度:', contentHTML.length);
  
  const contentArea = document.getElementById('content-area');
  contentArea.value = formatHTML(contentHTML);
  
  console.log('文章内容已成功提取并放入文本区域');
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

function createTreeNode(element, parentNode) {
  try {
    const li = document.createElement('li');
    const span = document.createElement('span');
    span.textContent = getElementDescription(element);
    span.style.cursor = 'pointer';
    span.addEventListener('click', () => selectTreeNode(element, span));
    li.appendChild(span);

    if (element.children.length > 0) {
      const ul = document.createElement('ul');
      ul.style.display = 'none';  // 初始状态为折叠
      Array.from(element.children).forEach(child => createTreeNode(child, ul));
      li.appendChild(ul);

      const toggleBtn = document.createElement('span');
      toggleBtn.textContent = '▶';  // 初始状态为折叠
      toggleBtn.style.marginRight = '5px';
      toggleBtn.style.cursor = 'pointer';
      toggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();  // 防止触发父元素的点击事件
        toggleTreeNode(toggleBtn, ul);
      });
      li.insertBefore(toggleBtn, span);
    }

    parentNode.appendChild(li);
  } catch (error) {
    console.error('Error creating tree node:', error);
  }
}

function getElementDescription(element) {
  let desc = element.tagName.toLowerCase();
  if (element.id) desc += `#${element.id}`;
  if (element.className && typeof element.className === 'string') {
    desc += `.${element.className.trim().replace(/\s+/g, '.')}`;
  } else if (element.classList && element.classList.length) {
    desc += `.${Array.from(element.classList).join('.')}`;
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
}

function saveContent() {
  console.log('开始保存内容...');
  
  const content = document.getElementById('content-area').value;
  
  if (!content) {
    console.error('没有内容可以保存');
    alert('没有内容可以保存，请先提取文章内容。');
    return;
  }

  console.log('要保存的内长度:', content.length);

  const fullHTML = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>微信公众号文章内容</title>
    <style>
      body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px; }
      img { max-width: 100%; height: auto; display: block; margin: 20px auto; }
      h1, h2, h3 { color: #1a1a1a; }
      a { color: #0066cc; text-decoration: none; }
      a:hover { text-decoration: underline; }
    </style>
</head>
<body>
    <div id="article-content">
    ${content}
    </div>
</body>
</html>
  `;
  
  const blob = new Blob([fullHTML], {type: 'text/html;charset=utf-8'});
  const downloadLink = document.createElement('a');
  downloadLink.href = URL.createObjectURL(blob);
  
  const today = new Date();
  const fileName = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}.html`;
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

function formatHTML(html) {
  let formatted = '';
  let indent = 0;
  const tab = '  '; // 使用两个空格作为缩进
  
  html.split(/>\s*</).forEach(element => {
    if (element.match(/^\/\w/)) {
      indent -= 1;
    }
    
    formatted += tab.repeat(indent) + '<' + element + '>\r\n';
    
    if (element.match(/^<?\w[^>]*[^\/]$/) && !element.startsWith("input")) {
      indent += 1;
    }
  });
  
  return formatted.substring(1, formatted.length - 3);
}

// 初始化
createEditor();

