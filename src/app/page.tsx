const workflowStages = ["Brief", "Shape", "Decide"];

export default function Home() {
  return (
    <main className="shell" id="main-content">
      <header className="masthead">
        <p className="wordmark" aria-label="Studio OS">
          Studio <span>OS</span>
        </p>
        <p className="status">
          <span aria-hidden="true" /> Foundation ready
        </p>
      </header>

      <section className="hero" aria-labelledby="page-title">
        <p className="eyebrow">Creative development workspace</p>
        <h1 id="page-title">Give every idea a clear next frame.</h1>
        <p className="lede">
          Studio OS turns creative briefs into shared decisions for animation
          teams. The workspace is ready for its first production workflow.
        </p>
      </section>

      <ol className="timing-track" aria-label="Brief workflow">
        {workflowStages.map((stage, index) => (
          <li key={stage}>
            <span className="frame-number" aria-hidden="true">
              {String(index + 1).padStart(2, "0")}
            </span>
            <span>{stage}</span>
          </li>
        ))}
      </ol>

      <footer className="footer">
        <p>Internal studio workspace</p>
        <p>Foundation · Task 01</p>
      </footer>
    </main>
  );
}
