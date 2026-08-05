const API_PREFIX = '/api/admin';
const ADMIN_SERVER_MODULE = new URL('./admin-server.mjs', import.meta.url).href;

function isAdminApiRequest(url = '/') {
  const pathname = url.split('?', 1)[0];
  return pathname === API_PREFIX || pathname.startsWith(`${API_PREFIX}/`);
}

export function singlePortAdminPlugin(environment = {}) {
  let handlerPromise;

  const loadHandler = () => {
    if (!handlerPromise) {
      Object.assign(process.env, environment, {
        NODE_ENV: 'development',
        ADMIN_API_HOST: '127.0.0.1',
        ADMIN_API_PORT: '5191',
        ADMIN_ALLOW_LOOPBACK_SETUP: 'true',
      });
      handlerPromise = import(ADMIN_SERVER_MODULE).then(module => module.adminRequestHandler);
    }
    return handlerPromise;
  };

  const attach = async server => {
    const handler = await loadHandler();
    server.middlewares.use((req, res, next) => {
      if (!isAdminApiRequest(req.url)) return next();
      Promise.resolve(handler(req, res)).catch(next);
    });
  };

  return {
    name: 'nk-single-port-admin-api',
    apply: 'serve',
    configureServer: attach,
    configurePreviewServer: attach,
  };
}
