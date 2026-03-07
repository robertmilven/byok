async function test() {
    console.log("Testing :predict");
    const r1 = await fetch("https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-001:predict?key=FAKE", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
    });
    console.log("predict status:", r1.status);
    console.log("predict text:", await r1.text());

    console.log("Testing :generateImages");
    const r2 = await fetch("https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-001:generateImages?key=FAKE", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
    });
    console.log("generateImages status:", r2.status);
    console.log("generateImages text:", await r2.text());
}
test();
