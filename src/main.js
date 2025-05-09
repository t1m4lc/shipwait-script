(function () {
  function main() {
    const element = document.getElementById("waitly");
    if (element) {
      element.textContent = "Hello from snippet!";
    } else {
      console.warn("Element with id 'waitly' not found.");
    }
  }

  main();
})();
