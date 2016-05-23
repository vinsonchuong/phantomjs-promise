import {parse, serialize} from 'ndjson';

class RequestQueue {
  constructor() {
    this.nextId = 1;
    this.requests = new Map();
  }

  defer(makeRequest) {
    return new Promise((resolve) => {
      const id = this.nextId;
      this.nextId += 1;
      this.requests.set(id, resolve);
      makeRequest(id);
    });
  }

  resolve(id, response) {
    this.requests.get(id)(response);
    this.requests.delete(id);
  }
}

class StdioAdapter {
  constructor(serverProcess) {
    this.inputStream = serialize();
    this.inputStream.on('data', (line) => {
      serverProcess.stdin.write(line);
    });

    this.outputStream = serverProcess.stdout.pipe(parse());
  }

  read(consume) {
    this.outputStream.on('data', consume);
  }

  write(payload) {
    this.inputStream.write(payload);
  }
}

export default class {
  constructor(serverProcess) {
    this.requests = new RequestQueue();
    this.stdio = new StdioAdapter(serverProcess);

    this.stdio.read((response) => {
      this.requests.resolve(response.id, response);
    });
  }

  send(method, params) {
    return this.requests.defer((id) => {
      this.stdio.write({id, method, params});
    });
  }
}
