import { parseStyleFile, parseStyleJSON } from './style-complier';

addEventListener('connect', (e: MessageEvent) => {
  const port = e.ports[0];

  port.addEventListener('message', (ev) => {
    const { data } = ev;
    const { _id } = data;

    let p: Promise<any> = null;
    switch (data.action) {
      case 'parseStyle':
        p = parseStyleFile(data.code, data.options, data.advanced);
        break;
      case 'parseJSON':
        p = parseStyleJSON(data.code, data.options, data.advanced);
        break;
    }

    if (p) {
      p.then((result) => {
        port.postMessage({
          id: _id,
          success: true,
          data: result,
        });
      })
        .catch((err) => {
          port.postMessage({
            id: _id,
            success: false,
            data: err,
          });
        });
      return;
    }

    port.postMessage({
      id: _id,
      success: false,
      data: new Error(`Unknown action ${data.action}`),
    });
  });

  port.start();
});
