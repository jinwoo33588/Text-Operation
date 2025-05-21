import React, { useState, useRef, useEffect , useLayoutEffect} from 'react';
import './App.css';

function App() {
  const [input, setInput] = useState('');
  const [tokens, setTokens] = useState([]);   // 확정된 토큰
  const [plain,  setPlain]  = useState('');   // 아직 토큰화되지 않은 문자열

  const editorRef = useRef(null); 

  const [result, setResult] = useState('');
  const [history, setHistory] = useState([]);
  const [expandedItems, setExpandedItems] = useState({});
  const [modalOpen, setModalOpen] = useState(false);
  const [overflowedItems, setOverflowedItems] = useState({});
  
  const textRefs = useRef([]);

  // ─── 2. 토큰화 함수 ───
  const tokenize = (text) => {
    const raw = text.match(/[^+\-×÷<>→∴=()]+|[+\-×÷<>→∴=()]/g) || [];
    return raw.map(t => t.trim()).filter(t => t !== '');
  };

  // ─── 3. 입력 이벤트 핸들러 ───
  const handleInput = () => {
    const text = editorRef.current.innerText;
    const all  = tokenize(text);
    setTokens(all.slice(0, -1));
    setPlain(all[all.length - 1] || '');
  };

  // ─── 4. Enter 키 처리 ───
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (plain.trim()) {
        setTokens(prev => [...prev, plain]);
        setPlain('');
      }
    }
  };

  // ─── 5. tokens/plain 바뀔 때 DOM 갱신 & 커서 복원 ───
  useLayoutEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
  
    // 1) innerHTML 재구성
    const html = [
      ...tokens.map(t => `<span class="pill-button">${t}</span>`),
      `<span class="plain-text">${plain}</span>`
    ].join(' ');
    editor.innerHTML = html;
  
    // 2) 커서 복원
    const sel = window.getSelection();
    sel.removeAllRanges();
    const range = document.createRange();
  
    const plainSpan = editor.querySelector('.plain-text');
  
    if (plainSpan && plainSpan.firstChild) {
      // 텍스트 노드가 있을 때는 그 끝으로
      range.setStart(plainSpan.firstChild, plain.length);
    } else {
      // 그렇지 않으면 에디터 끝으로
      range.selectNodeContents(editor);
      range.collapse(false);
    }
  
    sel.addRange(range);
  }, [tokens, plain]);
  
  
  // ── 3. input 변화에 따른 tokens/plain 자동 갱신 ──
  useEffect(() => {
    const all = tokenize(input);
    setTokens(all.slice(0, -1));
    setPlain(all[all.length - 1] || '');
  }, [input]);

  // ── 4. textarea onChange 핸들러 ──
  const handleChange = e => {
    setInput(e.target.value);
  };

 // ── 5. 버튼으로 연산자 삽입 ──
  const handleInsert = op => {
  // 기존 텍스트 끝에 연산자 삽입
    setInput(prev => prev + op);
  };

  // ── 6. 연산 수행 ──
  const handleEvaluate = () => {
    if (!input.trim()) {
      setResult('입력값이 없습니다.');
      return;
    }
    const rawTokens = input.trim().match(/[^+\-×÷<>→∴=()]+|[+\-×÷<>→∴=()]/g) || [];
    const toks = rawTokens.map(t => t.trim()).filter(Boolean);

    let output = toks[0];
    for (let i = 1; i < toks.length - 1; i += 2) {
      const op = toks[i], next = toks[i + 1];
      output = applyMeaning(output, next, op);
    }

    setResult(output);
    setHistory(prev => [...prev, output]);
  };
  
  
  // ── 7. 의미 결합 함수 ──
  const applyMeaning = (a, b, op) => {
    switch (op) {
      case '+':  return `${a}${b}`;
      case '-':  return `${a}에서 ${b} 제거`;
      case '×':  return `${a}과 ${b} 복합`;
      case '÷':  return `${a}을 ${b}로 분리`;
      case '<>': return `${a} vs ${b}`;
      case '→':  return `${a}→${b}`;
      case '()': return `${a}(${b})`;
      case '∴':  return `${a}, ${b} ⇒ 결론`;
      default:   return `${a} ${op} ${b}`;
    }
  };

  /*기록 삭제 */
  const handleDeleteItem = (index) => {
    setHistory((prev) => prev.filter((_, i) => i !== index));
    setExpandedItems((prev) => {
    const updated = { ...prev };
    delete updated[index];
    return updated;
    });
    setOverflowedItems((prev) => {
    const updated = { ...prev };
    delete updated[index];
    return updated;
    });
    };

  /*드래그 기능 */
   // 드래그 시작할 때 실행
  const handleDragStart = (e, text) => {
    // 드래그 데이터 설정
    e.dataTransfer.setData("text/plain", text);
  
    // 1. 가상 엘리먼트 생성
    const ghost = document.createElement("div");
    ghost.textContent = text;
    ghost.style.position = "absolute";
    ghost.style.top = "-9999px";
    ghost.style.left = "-9999px";
    ghost.style.padding = "4px 8px";
    ghost.style.background = "#555555";
    ghost.style.color = "#ffffff";
    ghost.style.fontSize = "0.875rem";
    ghost.style.border = "1px solid #ccc";
    ghost.style.borderRadius = "6px";
    ghost.style.boxShadow = "0 2px 4px rgba(0,0,0,0.1)";
    ghost.style.pointerEvents = "none";
    document.body.appendChild(ghost);
  
    // 2. drag 이미지 설정
    e.dataTransfer.setDragImage(ghost, 0, 0);
  
    // 3. drag 끝나면 제거
    e.target._ghost = ghost;
  };
  
  const handleDragEnd = (e) => {
    const ghost = e.target._ghost;
    if (ghost) {
      document.body.removeChild(ghost);
      delete e.target._ghost;
    }
  };
  
  const handleDragOver = (e) => {
    e.preventDefault(); // 꼭 필요!
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const droppedText = e.dataTransfer.getData("text/plain");
    setInput((prev) => prev + '' + droppedText);
  };

  // history overflow 여부 계산
  useEffect(() => {
    const newMap = {};
    textRefs.current.forEach((el, idx) => {
      if (el) {
        newMap[idx] = el.scrollWidth > el.clientWidth;
      }
    });
    setOverflowedItems(newMap);
  }, [history]);


  const toggleExpand = (index) => {
    setExpandedItems((prev) => ({ ...prev, [index]: !prev[index] }));
  };
  

  
  return (
    <div className="container">
      <div className="main-section">

      <div className="history-box">
          <div className="history-scroll">
            {history.length === 0
              ? <p className="empty-history">이전 결과가 없습니다.</p>
              : (() => {
                  // 3) 리렌더링될 때마다 refs 초기화
                  textRefs.current = [];
                  return history.map((item, index) => (
                    <div key={index} className="history-item">
                      {/* 4) overflow 된 경우에만 버튼 보이기 */}
                      {overflowedItems[index] && (
                        <button
                          className="expand-button"
                          onClick={() => setExpandedItems(prev => ({
                            ...prev, [index]: !prev[index]
                          }))}
                        >
                          {expandedItems[index] ? '⬆' : '>'}
                        </button>
                      )}

                      <div
                        ref={el => textRefs.current[index] = el}
                        className={`history-text ${expandedItems[index] ? 'expanded' : 'collapsed'}`}
                        draggable
                        onDragStart={(e) => handleDragStart(e, item)}
                        onDragEnd={handleDragEnd}
                      >
                        {item}
                      </div>

                      <div className="history-buttons">
                        <button
                          onClick={() => handleDeleteItem(index)}
                          className="delete-button danger"
                        >
                          X
                        </button>
                      </div>
                    </div>
                  ));
                })()
            }
          </div>
        </div>

        <div className="right-panel">
          <div className="title-panel">
          <h1 className="title">TEXT <br />CALCULATION</h1>
          <div className="panel-box">
          {/* ── 레이어드 토큰 에디터 ── */}
           <div className="editor-wrapper">
                <div className="tokens-layer">
                  {tokens.map((t, idx) =>
                    <button key={idx} className="pill-button">
                      {t}
                    </button>
                  )}
                  <span className="plain-text">{plain}</span>
                </div>
                <textarea
                  className="hidden-textarea"
                  placeholder="텍스트를 입력하세요..."
                  value={input}
                  onChange={handleChange}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                />
              </div>

          {/* ── 결과 박스 ── */}
          <div
            className={result ? 'result-box' : 'result-box empty'}
            onClick={() => {
              if (result) {
                setModalOpen(true);
              }
            }}
          >
            <div className="result-content">
              {result || '결과가 여기에 표시됩니다...'}
            </div>
            {result && (
              <button
                className="explanation-button"
                onClick={e => {
                  e.stopPropagation();    // 부모 클릭 이벤트 방지
                  setModalOpen(true);     // 모달 열기
                }}
              >
                풀이보기
              </button>
            )}
          </div>


          <div className="operator-grid">
          {['+', '-', '×', '÷', '<>', '()', '→', '∴', '='].map((op) => (
            <button
              key={op}
              className={op === '=' ? 'equal-button' : 'operator-button'}
              onClick={() => op === '=' ? handleEvaluate() : handleInsert(op)}
            >
            {op}
            </button>
          ))}

          </div>
        </div>
      </div>
      </div>
      {modalOpen && (
          <div className="modal-overlay" onClick={() => setModalOpen(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                
              </div>
              <div className="modal-card">
                <button className="close-button" onClick={() => setModalOpen(false)}>
                  풀이닫기
                </button>
                <p>결과 상세 내용을 여기에 표시할 수 있습니다.</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;