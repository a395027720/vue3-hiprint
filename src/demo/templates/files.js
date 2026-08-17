const modules = import.meta.glob('./template-files/*.js', { eager: true })
const templates = {}
for (const path in modules) {
  let templateKey = path.replace(/^\.\/template-files\//, '').replace(/(\.js)/, '')
  templates[templateKey] = Object.assign(templates[templateKey] || {}, modules[path].default)
}
export default templates
