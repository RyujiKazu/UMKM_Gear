CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ NULL
);

CREATE UNIQUE INDEX uq_users_active_email ON users (LOWER(email)) WHERE deleted_at IS NULL;

CREATE TABLE profiles (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL UNIQUE REFERENCES users(id) ON DELETE RESTRICT,
    business_name VARCHAR(150) NOT NULL,
    business_type VARCHAR(100) NOT NULL,
    phone VARCHAR(25) NOT NULL,
    address TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE categories (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ NULL
);

CREATE UNIQUE INDEX uq_categories_active_name ON categories (LOWER(name)) WHERE deleted_at IS NULL;

CREATE TABLE units (
    id BIGSERIAL PRIMARY KEY,
    unit_code VARCHAR(50) NOT NULL,
    name VARCHAR(150) NOT NULL,
    description TEXT NULL,
    condition_status VARCHAR(20) NOT NULL DEFAULT 'good'
        CHECK (condition_status IN ('good', 'minor_damage', 'damaged')),
    availability_status VARCHAR(20) NOT NULL DEFAULT 'available'
        CHECK (availability_status IN ('available', 'borrowed', 'maintenance', 'inactive')),
    fine_per_day NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (fine_per_day >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ NULL
);

CREATE UNIQUE INDEX uq_units_active_code ON units (LOWER(unit_code)) WHERE deleted_at IS NULL;
CREATE INDEX idx_units_name ON units (LOWER(name));
CREATE INDEX idx_units_availability ON units (availability_status) WHERE deleted_at IS NULL;

CREATE TABLE unit_categories (
    unit_id BIGINT NOT NULL REFERENCES units(id) ON DELETE CASCADE,
    category_id BIGINT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (unit_id, category_id)
);

CREATE TABLE loans (
    id BIGSERIAL PRIMARY KEY,
    loan_code VARCHAR(50) NOT NULL UNIQUE,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    borrowed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    due_at TIMESTAMPTZ NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'partially_returned', 'completed', 'cancelled')),
    notes TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_loan_duration CHECK (
        due_at > borrowed_at AND due_at <= borrowed_at + INTERVAL '5 days'
    )
);

CREATE INDEX idx_loans_user_status ON loans (user_id, status);
CREATE INDEX idx_loans_due_at ON loans (due_at);

CREATE TABLE loan_items (
    id BIGSERIAL PRIMARY KEY,
    loan_id BIGINT NOT NULL REFERENCES loans(id) ON DELETE RESTRICT,
    unit_id BIGINT NOT NULL REFERENCES units(id) ON DELETE RESTRICT,
    status VARCHAR(20) NOT NULL DEFAULT 'borrowed' CHECK (status IN ('borrowed', 'returned')),
    borrowed_condition VARCHAR(20) NOT NULL
        CHECK (borrowed_condition IN ('good', 'minor_damage', 'damaged')),
    fine_per_day_snapshot NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (fine_per_day_snapshot >= 0),
    returned_at TIMESTAMPTZ NULL,
    returned_by BIGINT NULL REFERENCES users(id) ON DELETE RESTRICT,
    returned_condition VARCHAR(20) NULL
        CHECK (returned_condition IN ('good', 'minor_damage', 'damaged')),
    late_days INTEGER NOT NULL DEFAULT 0 CHECK (late_days >= 0),
    fine_amount NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (fine_amount >= 0),
    return_notes TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (loan_id, unit_id)
);

CREATE UNIQUE INDEX uq_loan_items_active_unit ON loan_items (unit_id) WHERE status = 'borrowed';
CREATE INDEX idx_loan_items_loan_status ON loan_items (loan_id, status);

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_set_updated_at BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER profiles_set_updated_at BEFORE UPDATE ON profiles
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER categories_set_updated_at BEFORE UPDATE ON categories
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER units_set_updated_at BEFORE UPDATE ON units
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER loans_set_updated_at BEFORE UPDATE ON loans
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER loan_items_set_updated_at BEFORE UPDATE ON loan_items
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
