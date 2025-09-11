const drag = {
  install(app) {
    const store = {
      dragging: false,
      dragTarget: null,
      yDifference: 0,
      xDifference: 0
    };

    const startDrag = (el, event) => {
      const e = event.type.includes('touch') ? event.touches[0] : event;
      store.dragging = true;
      store.dragTarget = el;
      store.yDifference = e.clientY - store.dragTarget.offsetTop;
      store.xDifference = e.clientX - store.dragTarget.offsetLeft;
    };

    const doDrag = (event) => {
      if (store.dragging && store.dragTarget) {
        const e = event.type.includes('touch') ? event.touches[0] : event;
        let x = e.clientX - store.xDifference;
        let y = e.clientY - store.yDifference;

        // 画面の上部や左端に到達した場合の制約
        if (y < 0) y = 0;
        if (x < 0) x = 0;

        store.dragTarget.style.top = y + 'px';
        store.dragTarget.style.left = x + 'px';
      }
    };

    const stopDrag = () => {
      store.dragging = false;
      store.dragTarget = null;
    };

    app.directive('my-drag-handle', {
      beforeMount(el) {
        el.addEventListener('mousedown', (e) => startDrag(el.parentNode, e), false);
        el.addEventListener('touchstart', (e) => startDrag(el.parentNode, e), false);
      }
    });

    app.directive('my-drag', {
      beforeMount(el) {
        el.addEventListener('mousedown', (e) => startDrag(el, e), false);
        el.addEventListener('touchstart', (e) => startDrag(el, e), false);
      }
    });

    const addListeners = () => {
      window.addEventListener('mousemove', doDrag);
      window.addEventListener('mouseup', stopDrag);
      window.addEventListener('touchmove', doDrag);
      window.addEventListener('touchend', stopDrag);
    };

    const removeListeners = () => {
      window.removeEventListener('mousemove', doDrag);
      window.removeEventListener('mouseup', stopDrag);
      window.removeEventListener('touchmove', doDrag);
      window.removeEventListener('touchend', stopDrag);
    };

    addListeners();

    // コンポーネントが破棄される前にリスナーを削除
    app.mixin({
      beforeUnmount() {
        removeListeners();
      }
    });
  }
};

export default drag;
