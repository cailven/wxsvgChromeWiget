# WeChat SVG Chrome Widget

## 功能概述

这是一个 Chrome 扩展插件，用于提取和处理微信公众号文章中的内容。主要功能包括：

1. 提取文章全部内容
2. 选择性提取特定元素
3. 生成文章内容的树状结构视图
4. 精简 HTML 结构（可选）
5. 格式化提取的 HTML 内容
6. 保存提取的内容为 HTML 文件

## 开发过程

### 1. 初始化项目

- 创建基本的 Chrome 扩展结构，包括 `manifest.json`、`background.js` 和 `content.js`
- 实现基础的内容提取功能

### 2. 增强功能

- 添加树状结构视图，允许用户选择特定元素
- 实现页面元素高亮功能
- 添加精简 HTML 结构的选项
- 实现 HTML 格式化功能

### 3. 用户界面优化

- 设计并实现浮动编辑器界面
- 添加各种操作按钮（提取全部内容、提取选中内容、清除选中、保存等）
- 优化编辑器样式，包括深色主题

### 4. 代码优化

- 重构代码以提高可读性和可维护性
- 添加错误处理和日志记录

## 主要文件说明

- `manifest.json`: 扩展的配置文件
- `background.js`: 后台脚本，处理扩展图标点击事件
- `content.js`: 内容脚本，包含主要的功能实现
- `icon16.png`, `icon48.png`, `icon128.png`: 扩展图标

## 待办事项

- [ ] 优化树状结构视图的性能，特别是对于大型文档
- [ ] 添加更多自定义选项，如选择性保留特定属性
- [ ] 实现撤销/重做功能
- [ ] 添加单元测试
- [ ] 优化 CSS 选择器生成算法

## 开发注意事项

1. 确保在微信公众号文章页面（`https://mp.weixin.qq.com/*`）上使用此扩展
2. 注意处理大型文档时的性能问题
3. 保持用户界面的响应性和直观性
4. 定期测试不同类型的文章，确保兼容性

## 如何继续开发

1. 克隆仓库到本地
2. 在 Chrome 中加载已解压的扩展（开发者模式）
3. 修改 `content.js` 以添加或修改功能
4. 使用 Chrome 开发者工具进行调试
5. 定期提交更改并推送到 GitHub 仓库

## 贡献指南

欢迎提交 Pull Requests 来改进这个项目。在提交之前，请确保您的代码符合现有的代码风格，并且所有的功能都经过充分测试。

## 许可证

[MIT License](LICENSE)

## Changelog

### 2023-10-22

#### 新增功能
1. 实现了精简 HTML 功能，可以移除不必要的属性（如 powered-by, label, copyright, cr 和所有 data- 属性）。
2. 添加了 HTML 格式化功能，无论是否精简 HTML，都会对内容进行格式化以提高可读性。
3. 在属性面板中为背景图片和 img 标签添加了缩略图显示。
4. 实现了缩略图的鼠标悬停放大预览效果。

#### 改进
1. 优化了 tree-view 的显示，调整了字体大小和区域高度，使其占据屏幕高度的三分之一。
2. 增加了 content-area 的高度，确保其至少占据屏幕高度的三分之一以上。
3. 改进了精简 HTML 功能的处理逻辑，确保对所有子节点都进行了正确的属性清理。
4. 修复了切换精简 HTML 选项时可能导致内容重置为全部内容的问题。

#### 代码重构
1. 引入了 `currentHTML` 变量来存储当前显示的内容，以便在切换精简 HTML 选项时保持当前选中的内容。
2. 重构了 `updateAttributesPanel` 函数，使其能够根据精简 HTML 选项的状态动态显示或隐藏特定属性。
3. 优化了 `processElement` 函数，确保递归处理所有子元素的属性。

#### 样式调整
1. 调整了编辑器面板的整体布局，优化了各个区域的比例。
2. 为缩略图和预览图添加了相应的样式，提升了用户体验。

## 最新更新 (2024-10-23)

1. 改进了`animateTransform`元素的解析和显示:
   - 现在正确识别和显示变换类型(如translate、scale等)
   - 在属性名旁边显示变换类型,例如: `transform (translate)`
   - 即使没有`keyTimes`属性,也能根据`dur`和值的数量估算时间点

2. 优化了动画过程的描述:
   - 更准确地显示每个关键帧的时间点
   - 改进了没有`keyTimes`时的时间估算逻辑

3. 增加了对以下属性的支持:
   - `repeatCount`
   - `calcMode`
   - `keySplines`

4. 改进了属性值的显示逻辑:
   - 使用 `|| 'null'` 来处理可能不存在的属性
   - 只在`keySplines`存在时

## 最新更新 (2024-03-10)

1. 改进了`animateTransform`元素的解析和显示:
   - 现在正确识别和显示变换类型(如translate、scale等)
   - 在属性名旁边显示变换类型,例如: `transform (translate)`
   - 即使没有`keyTimes`属性,也能根据`dur`和值的数量估算时间点

2. 优化了动画过程的描述:
   - 更准确地显示每个关键帧的时间点
   - 改进了没有`keyTimes`时的时间估算逻辑

3. 增加了对以下属性的支持:
   - `repeatCount`
   - `calcMode`
   - `keySplines`

4. 改进了属性值的显示逻辑:
   - 使用 `|| 'null'` 来处理可能不存在的属性
   - 只在`keySplines`存在时显示该属性

## 功能特点

- 解析SVG动画元素,包括`<animate>`和`<animateTransform>`
- 显示详细的动画属性信息
- 直观展示动画过程和时间线
- 支持复杂的SVG动画,如多关键帧和不同类型的变换

## 使用说明

[在这里添加使用说明]

## 贡献

欢迎提交问题和改进建议!

## 许可证

[在这里添加许可证信息]

# SVG动画分析工具

![工具界面预览](img.png)
