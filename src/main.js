function runSnippet() {
  const element = document.getElementById("waitly");
  if (element) {
    element.textContent = "Hello from snippet!";
  } else {
    console.warn("Element with id 'waitly' not found.");
  }
}

runSnippet();
