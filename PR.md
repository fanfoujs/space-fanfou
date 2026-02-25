  feat: Migrate to MV3, integrate OAuth, and add new UX enhancements

  描述

  Background

  Chrome 已全面弃用并下架 MV2 扩展。本 PR 将 Space Fanfou 完整迁移至 Manifest V3，修复了迁移过程中因架构变更和
   API 失效导致的核心功能损坏，并新增了数项实用功能。

  ---
  What's Changed

  1. Manifest V3 Migration

  - Background Page → Service Worker，更新 manifest.json
  - 重构 bridge.js 与跨脚本通信层，加入 try-catch 应对 Service Worker 休眠断连，解决 Promise 回调死锁问题
  - 修复 contextMenus、定时器等多处 MV3 兼容性问题

  2. OAuth Integration & API Migration

  - 内置 Consumer Key：开箱即用，用户无需自行申请开发者密钥
  - 一键授权：设置页内完成 OAuth 授权闭环，无繁琐手动配置
  - 将 sidebar-statistics（注册时间）、check-friendship（互关状态）等功能从已失效的 DOM 抓取 / JSONP
  方案，迁移至稳定的 OAuth API（users/show.json、friends/show.json）

  3. Bug Fixes

  - 修复图片拖放/粘贴上传导致输入框永久冻结的无限循环问题
  - 修复 check-friendship URL 构造错误及 hasChecked 阻止重试的问题
  - 修复 favorite-fanfouers DOM 访问错误
  - 修复多处 Service Worker 定时器泄漏问题

  4. New Features

  - 头像壁纸 (Avatar Wallpaper)：将他人饭否页面背景替换为关注者的动态头像墙排列，支持有爱饭友优先排序，默认
  opt-in（需手动开启）
  - 发文草稿自动保存：输入内容自动持久化，支持断点恢复，发文成功后自动清空
  - 字数预警增强：输入超过 120 字时黄色预警，超过 135 字时红色危险提示，渐进式视觉反馈

  ---
  Acknowledgements

  本次 MV3 重构与 OAuth 破局中，特别感谢核心贡献者 @LitoMore。
  扩展内置的 Consumer Key 直接来自其开源项目
  nofan——某种意义上，是用饭友曾经打造的另一把钥匙，重新打开了这座太空舱的门。

  本次迁移工程由 @halmisen 主导，在 Claude Code（Sonnet 4.6）、Codex CLI 与 Gemini CLI
  的协助下完成代码库诊断、重构、功能新编与测试覆盖。

  ---
  主要变更：3 项新功能 / 109 个文件 / ~11k 行