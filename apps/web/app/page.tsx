const products = [
  ["Apple Gift Card", "US • Digital"],
  ["Google Play", "US • Digital"],
  ["PlayStation", "US • Digital"],
  ["Xbox", "US • Digital"],
];

const flow = [
  ["01", "انتخاب محصول", "قیمت و موجودی شفاف"],
  ["02", "پرداخت امن", "ثبت تراکنش با شناسه یکتا"],
  ["03", "تأیید پرداخت", "پرداخت موفق از تحویل جداست"],
  ["04", "تحویل آنی", "Fulfillment خودکار و قابل Retry"],
];

export default function Home() {
  return (
    <main>
      <section className="hero">
        <div className="container">
          <nav className="nav">
            <div className="brand">ریشه / DIGITAL GOODS</div>
            <div className="badge">MVP • آماده تست</div>
          </nav>

          <div className="grid">
            <div className="card">
              <div className="badge">Digital Goods Infrastructure</div>
              <h1>خرید دیجیتال،<br />سریع و مطمئن.</h1>
              <p className="lead">
                پلتفرم ریشه برای خرید محصولات دیجیتال بین‌المللی با قیمت‌گذاری ریالی،
                پرداخت، تأیید تراکنش و تحویل خودکار.
              </p>
              <div className="actions">
                <a className="button" href="#products">مشاهده محصولات</a>
                <a className="button secondary" href="/api/health">بررسی API</a>
              </div>
            </div>

            <div className="card" id="products">
              <div className="badge">محصولات منتخب</div>
              <div className="products">
                {products.map(([name, meta]) => (
                  <div className="product" key={name}>
                    <strong>{name}</strong>
                    <span>{meta}</span>
                  </div>
                ))}
              </div>
              <div className="flow">
                {flow.map(([number, title, description]) => (
                  <div className="step" key={number}>
                    <span><b>{title}</b><br />{description}</span>
                    <span>{number}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
      <footer className="footer container">Risheh Digital • Transaction-safe digital delivery</footer>
    </main>
  );
}
