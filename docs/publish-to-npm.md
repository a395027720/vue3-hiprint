# 发布到 npm 踩坑记录

> 适用版本:`@jake-gao/vue3-hiprint` 首次发布,Mac + Node 18+,npm 9+。
> 场景:scope 包(`@org/xxx`)首次 publish 失败时的排查与解决。

## 1. 完整发布流程(正常路径)

```bash
# 1. 一次性:登录 npm(会写入新 token 到 ~/.npmrc)
npm login

# 2. 一次性:确认账号已加入 @jake-gao 组织(Developer 角色以上)
#    路径:https://www.npmjs.com/settings/jake-gao/members

# 3. 每次发版:在 package.json 显式声明公开访问(scope 包必加)
#    "publishConfig": { "access": "public", "registry": "https://registry.npmjs.org/" }

# 4. 每次发版:构建产物
npm run build-lib

# 5. dry-run 检查 tarball
npm publish --dry-run

# 6. 正式发布
npm run pub
# 或: npm publish --registry=https://registry.npmjs.org/
```

## 2. 踩过的 4 个坑

### 坑 1:`E404 Not Found`(scope 还没归属)

```
npm ERR! 404 Not Found - PUT https://registry.npmjs.org/@jake-gao%2fvue3-hiprint
```

**根因**:`@jake-gao` 这个 scope 没在 npm 上归属到你。

**排查**:
```bash
# 看 scope 下是否有任何包
curl -sS -I https://registry.npmjs.org/@jake-gao/vue3-hiprint
# 返回 404 = 这个包不存在(可能 scope 归你,也可能没归)
```

**解法二选一**:
- 在 https://www.npmjs.com/org/create 创建 `@jake-gao` 组织,把当前账号加为 Developer
- 或把包名改成 `@<你的用户名>/vue3-hiprint`(首次 publish 会自动创建用户 scope)

### 坑 2:`E401 Unauthorized` / `npm login` 卡 `Socket connection timeout`

```
npm ERR! 401 Unauthorized - GET https://registry.npmjs.org/-/whoami
npm ERR! ERR_SOCKET_CONNECTION_TIMEOUT
```

**根因**:`~/.npmrc` 里有过期/失效的 `_authToken`,npm 拿着旧凭证去对话被服务端拒。

**排查**:
```bash
cat ~/.npmrc
# 看到类似:
//registry.npmjs.org/:_authToken=npm_xxx...
```

**解法**:
1. 把失效的 `_authToken` 行**注释掉**(不要直接删,方便出问题回滚)
2. 跑 `npm login` 重新登录,npm 会自动写入新 token
3. 同时清掉 `~/.npmrc` 里残留的 `production=false`、`include[]=dev`、`product=false` 等脏配置,避免 npm 一直报警告

### 坑 3:`EACCES` 缓存目录权限

```
npm ERR! Your cache folder contains root-owned files, due to a bug in
npm ERR! previous versions of npm which has since been addressed.
```

**根因**:之前用 `sudo npm` 装过包,导致 `~/.npm/_cacache` 被 root 拥有。

**解法**:
```bash
sudo chown -R 501:20 "/Users/gaojianqiang/.npm"
# 501 是当前用户 UID,可用 `id -u` 确认
```

### 坑 4:`E402 Payment Required - You must sign up for private packages`

```
npm ERR! 402 Payment Required - PUT https://registry.npmjs.org/@jake-gao%2fvue3-hiprint
npm ERR! You must sign up for private packages
```

**根因**:这是 npm 的**误导性错误**。scope 包默认按私包处理,即使 scope 是组织。

**解法**:在 `package.json` 显式声明公开访问:

```json
{
  "publishConfig": {
    "access": "public",
    "registry": "https://registry.npmjs.org/"
  }
}
```

## 3. 发布后验证

```bash
# 直接查包元信息
npm view @jake-gao/vue3-hiprint

# 浏览器查看(注意 CDN 有 30 秒~几分钟同步延迟)
# https://www.npmjs.com/package/@jake-gao/vue3-hiprint

# 在另一个项目里安装测试
mkdir /tmp/test-install && cd /tmp/test-install
npm init -y
npm install @jake-gao/vue3-hiprint
```

## 4. 避坑清单(发布前自查)

- [ ] `~/.npmrc` 没有失效的 `_authToken`
- [ ] `npm whoami` 能输出正确的用户名
- [ ] 当前账号已加入 `@jake-gao` 组织(Developer+ 角色)
- [ ] `package.json` 有 `publishConfig.access: "public"`(scope 包必加)
- [ ] `~/.npm/_cacache` 归属是当前用户(`ls -la ~/.npm | head`)
- [ ] `npm run build-lib` 成功,`dist/` 是最新的
- [ ] `npm publish --dry-run` 输出符合预期
- [ ] 启用了 2FA,准备好 authenticator 一次性密码
