const assert = require("node:assert/strict");
const test = require("node:test");

test("webview project routes prime the right-top share card", () => {
  let pageDefinition;
  let requestedUrl;
  global.Page = (definition) => {
    pageDefinition = definition;
  };
  global.wx = {
    request(options) {
      requestedUrl = options.url;
      options.success({
        statusCode: 200,
        data: {
          id: 1,
          title: "灵知",
          intro: "一句话课程生成",
        },
      });
    },
  };

  const modulePath = require.resolve("../pages/webview/index");
  delete require.cache[modulePath];
  require(modulePath);

  pageDefinition.targetPath = "/projects?id=1";
  pageDefinition.primeProjectSharePayload();

  assert.match(requestedUrl, /\/api\/projects\/1$/);
  assert.equal(pageDefinition.sharePayload.title, "灵知");
  assert.equal(pageDefinition.sharePayload.path, "/projects?id=1");
  assert.match(pageDefinition.sharePayload.imageUrl, /\/api\/projects\/1\/share-card\.png$/);

  const shareMessage = pageDefinition.onShareAppMessage({});
  assert.deepEqual(shareMessage, {
    title: "灵知",
    path: "/pages/webview/index?path=%2Fprojects%3Fid%3D1",
    imageUrl: pageDefinition.sharePayload.imageUrl,
  });

  delete global.Page;
  delete global.wx;
});
