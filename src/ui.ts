function printResult(
  table,
  baseline: LHResponse,
  result: LHResponse,
  index: number
) {
  const row = table.insertRow(1 + index);
  row.classList.add('result');
  const url = row.insertCell(0);
  if (result.blockedURL.length > 70) {
    url.innerText = result.blockedURL.substring(0, 70) + '...';
  } else if (result.blockedURL.length === 0) {
    url.innerText = 'BASELINE';
  } else {
    url.innerText = result.blockedURL;
  }
  url.title = result.blockedURL;
  row.insertCell(1).innerText = result.scores.LCP;
  row.insertCell(2).innerText = result.scores.FCP;
  row.insertCell(3).innerText = result.scores.CLS;
  row.insertCell(4).innerText = result.scores.consoleErrors;
  row.insertCell(
    5
  ).innerHTML = `<a href="${result.reportUrl}" target="_blank">LINK</a>`;
}

function printResults(results: LHResponse[]) {
  const table = document.getElementById('results');

  document.querySelectorAll('.result').forEach(e => e.remove());
  table.style.display = 'block';

  results.forEach((result, index) =>
    printResult(table, results[0], result, index)
  );
}

function showError(message: string) {
  const error = document.getElementById('error');
  error.innerText = message;
  error.style.display = 'block';
}

function submit(e: Event) {
  e.preventDefault();
  const submitButton = document.getElementById('submit') as HTMLButtonElement;
  const url = (document.getElementById('url') as HTMLFormElement).value;
  const userAgent = (document.getElementById('agent') as HTMLFormElement).value;
  try {
    submitButton.disabled = true;
    const error = document.getElementById('error');
    error.innerText = '';
    error.style.display = 'none';

    const table = document.getElementById('results');
    table.style.display = 'none';
    const xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function () {
      if (this.readyState === 4) {
        submitButton.disabled = false;
        const result = JSON.parse(this.responseText);

        if (this.status === 200) {
          if (result.error) {
            showError(result.error);
          } else {
            printResults(result);
          }
        } else {
          showError('Unexpected server error');
        }
      }
    };
    xhr.open(
      'GET',
      '/test/' +
        encodeURIComponent(url) +
        '?' +
        (userAgent ? `userAgent=` + encodeURIComponent(userAgent) : ''),
      true
    );
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.send();
  } catch (e) {
    submitButton.disabled = false;
    showError(e.message);
    console.error(e);
    throw new Error(e.message);
  }
  return false;
}
