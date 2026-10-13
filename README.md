# Weekly Planner · 每周课表

一个可以编辑、可以打印的每周课表网页。纯 HTML / CSS / JavaScript，没有任何依赖，也不需要构建，直接放到 GitHub Pages 就能用。

An editable, printable weekly schedule. Plain HTML, CSS and JavaScript with no build step. English notes are at the bottom.

## 功能

- **每周固定安排**和**只在某一周的安排**分开管理，只在本周的方块带斜纹
- **拖动操作**：在空白处拖动直接新建；拖动方块改时间或换到别的天；拖方块底边改结束时间（每 15 分钟对齐）
- 固定安排可以 **“只改本周”** 或 **“本周跳过”**，不影响其他周
- 每周独立的**待办**和**备注**
- 自动统计**本周课程 / 工作 / 社团小时数**
- **打印视图**：选打印哪几天、哪些类型、时间范围、横向或纵向、Letter 或 A4、黑白省墨，右边是真实纸张比例的预览，保证一页打完
- 撤销（⌘Z / Ctrl+Z）、导出 / 导入备份、中英文切换、深色模式
- 手机上也能看和点按编辑

## 部署到 GitHub Pages

1. 在 GitHub 新建一个 repository，例如 `weekly-planner`
2. 把这个文件夹里的所有文件上传到 repo 根目录（保持 `css/`、`js/` 文件夹结构）
3. 打开 repo 的 **Settings → Pages**
4. **Build and deployment → Source** 选 **Deploy from a branch**，Branch 选 `main`，文件夹选 `/ (root)`，点 Save
5. 等一两分钟，网址是 `https://<你的用户名>.github.io/weekly-planner/`

用命令行上传：

```bash
cd weekly-planner
git init
git add .
git commit -m "Weekly planner"
git branch -M main
git remote add origin https://github.com/<你的用户名>/weekly-planner.git
git push -u origin main
```

本地预览：直接双击 `index.html` 用浏览器打开即可。

## 数据保存在哪里

所有修改都自动保存在**当前浏览器的 localStorage** 里，不会上传到任何服务器，也不会写回 GitHub。所以：

- 换电脑、换浏览器，或者清除浏览器数据之前，用 **⋯ → 导出备份** 存一个 `.json` 文件
- 在新的地方用 **⋯ → 导入备份** 恢复

## 修改初始课表

第一次打开网站时加载的课表在 `js/default-schedule.js`。格式：

```js
{ title: "MATH306", cat: "class", days: [1, 3], start: "09:00", end: "10:15", place: "Jepson Hall" }
```

- `days`：0 = 周一 … 6 = 周日
- `cat`：`class` 课程、`work` 工作、`meeting` 会议 / 社团、`other` 其他

注意：如果 repo 是公开的，任何打开这个网址的人都会看到这份初始课表。不想公开的话，把它改成 `window.DEFAULT_SCHEDULE = [];`，然后在自己的浏览器里导入备份。

已经打开过网站的浏览器不会自动读新的初始课表，需要 **⋯ → 恢复初始课表**（可以撤销）。

## 打印小技巧

- 在打印窗口里勾选 **背景图形 / Background graphics**，颜色才会打出来
- 想要 PDF：打印机选 **存储为 PDF / Save as PDF**
- 在任何页面按 ⌘P / Ctrl+P 都会按“打印”页的设置输出

## 快捷键

| 按键 | 作用 |
| --- | --- |
| `N` | 新建安排 |
| `←` `→` | 上一周 / 下一周 |
| `T` | 回到本周 |
| `P` | 切换编辑 / 打印视图 |
| `⌘Z` / `Ctrl+Z` | 撤销 |

## 文件结构

```
weekly-planner/
├── index.html               页面结构
├── favicon.svg              网站图标
├── css/style.css            样式（包括打印样式和深色模式）
├── js/default-schedule.js   初始课表
└── js/app.js                全部逻辑
```

---

## English

**Features:** recurring and one-week-only events, drag to create / move / resize, "change this week only" and "skip this week" for recurring events, weekly to-dos and notes, hours per category, a print view with true-to-paper preview (days, types, time range, Letter/A4, portrait/landscape, black and white), undo, JSON backup export/import, English/Chinese, dark mode.

**Deploy:** push these files to a repo, then Settings → Pages → Deploy from a branch → `main` / root.

**Data:** everything is stored in the browser's localStorage. Use ⋯ → Export backup before switching devices.

**Default schedule:** edit `js/default-schedule.js`. If the repo is public, so is that schedule; set it to `[]` to ship an empty planner.
