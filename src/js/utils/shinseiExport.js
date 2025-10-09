// src/js/utils/shinseiExport.js
export async function exportShinseiZip({ applications, userDir }) {
    const fd = new FormData()
    fd.append('dir', userDir) // 例: ログインID等（英数-_）
    fd.append('payload', JSON.stringify({ applications }))
    const res = await fetch('https://kenzkenz.net/myphp/shinsei_export.php', {
        method: 'POST',
        body: fd
    })
    if (!res.ok) throw new Error('export failed');
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'shinsei-export.zip';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}
