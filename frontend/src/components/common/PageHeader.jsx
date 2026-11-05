export default function PageHeader({ title, description, actions, badge }) {
  return (
    <header className="page-header">
      <div className="page-header__text">
        <div className="page-header__row">
          <h1>{title}</h1>
          {badge}
        </div>
        {description && <p>{description}</p>}
      </div>
      {actions && <div className="page-header__actions">{actions}</div>}
    </header>
  );
}
