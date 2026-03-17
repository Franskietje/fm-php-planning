let planningData = null;

function setStatus(msg) 
{
  const el = document.getElementById('status');
  if (el) el.textContent = msg || '';
}

async function loadPlanning(from, to) 
{
  try 
  {
    setStatus('Loading...');

    const params = new URLSearchParams({ from, to });
    const url = `api/find/planning.php?${params.toString()}`;

    const res = await fetch(url, {credentials: 'include'});
    const json = await res.json();

    if (!json.ok) 
   { 
      console.error('API error', json);
      setStatus('API error (see console).');
      return;
    }

    planningData = json;

    setStatus('');
    fillProjectleiderDropdown(planningData);
    filterByProjectleider('__all__');
  } 
  catch (err) 
  {
    console.error('Fetch error', err);
    setStatus('Fetch error (see console).');
  }
}

