const test = require("node:test");
const assert = require("node:assert/strict");
const { classifyImage } = require("./mlController");

const createResponse = () => ({
  statusCode: 200,
  body: null,
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(body) {
    this.body = body;
    return this;
  },
});

const createRequest = () => ({
  file: {
    buffer: Buffer.from("image"),
    mimetype: "image/jpeg",
    originalname: "waste.jpg",
  },
});

test("returns normalized predictions and disposal guidance", async (context) => {
  const originalFetch = global.fetch;
  context.after(() => {
    global.fetch = originalFetch;
  });

  global.fetch = async (url, options) => {
    assert.equal(url, "http://localhost:8000/predict");
    assert.equal(options.method, "POST");
    const uploadedFile = options.body.get("file");
    assert.equal(uploadedFile.name, "waste.jpg");

    return new Response(JSON.stringify({
      category: "plastic",
      confidence: 1.2,
      predictions: [
        { category: "paper", confidence: 0.6 },
        { category: "plastic", confidence: 0.8 },
        { category: "glass", confidence: 0.2 },
        { category: "metal", confidence: 0.1 },
      ],
    }), { status: 200 });
  };

  const response = createResponse();
  await classifyImage(createRequest(), response);

  assert.equal(response.statusCode, 200);
  assert.equal(response.body.category, "plastic");
  assert.equal(response.body.confidence, 1);
  assert.deepEqual(response.body.predictions, [
    { category: "plastic", confidence: 0.8 },
    { category: "paper", confidence: 0.6 },
    { category: "glass", confidence: 0.2 },
  ]);
  assert.equal(response.body.guidance.label, "Plastic");
});

test("uses the top prediction when the service omits its primary category", async (context) => {
  const originalFetch = global.fetch;
  context.after(() => {
    global.fetch = originalFetch;
  });
  global.fetch = async () => new Response(JSON.stringify({
    predictions: [{ class: "glass", score: 0.75 }],
  }), { status: 200 });

  const response = createResponse();
  await classifyImage(createRequest(), response);

  assert.equal(response.statusCode, 200);
  assert.equal(response.body.category, "glass");
  assert.equal(response.body.confidence, 0.75);
  assert.equal(response.body.predictions.length, 1);
});

test("returns a gateway error for a successful but unusable service response", async (context) => {
  const originalFetch = global.fetch;
  context.after(() => {
    global.fetch = originalFetch;
  });
  global.fetch = async () => new Response(JSON.stringify({ predictions: [] }), { status: 200 });

  const response = createResponse();
  await classifyImage(createRequest(), response);

  assert.equal(response.statusCode, 502);
  assert.match(response.body.message, /predicted category/i);
});
