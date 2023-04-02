import { nanoid } from 'nanoid';
import { BasicStyle, SavedStyle } from '../core/types';

let _worker: SharedWorker | null = null;

const queue: Map<string, { resolve: any; reject: any }> = new Map();

function getWorker() {
  if (!_worker) {
    _worker = new SharedWorker('/assets/js/worker-style-parser.js');
    _worker.port.addEventListener('message', (ev) => {
      const { id, success, data } = ev.data;
      const item = queue.get(id);
      if (item) {
        if (success) {
          item.resolve(data);
        } else {
          item.reject(data);
        }
      }
      queue.delete(id);
    });
    _worker.port.start();
  }
  return _worker;
}

function sendWorker(message: any): Promise<any> {
  const worker = getWorker();
  const id = nanoid();
  return new Promise((resolve, reject) => {
    queue.set(id, { resolve, reject });
    worker.port.postMessage({
      ...message,
      _id: id,
    });
  });
}

export function parseStyleFile(code: string, options?: Partial<BasicStyle>, advanced?: Partial<SavedStyle['advanced']>): Promise<BasicStyle> {
  return sendWorker({
    action: 'parseStyle',
    code,
    options,
    advanced,
  });
}

export function parseStyleJSON(code: string, options?: Partial<BasicStyle>, advanced?: Partial<SavedStyle['advanced']>): Promise<BasicStyle> {
  return sendWorker({
    action: 'parseJSON',
    code,
    options,
    advanced,
  });
}
