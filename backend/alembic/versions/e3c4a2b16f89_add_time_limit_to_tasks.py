"""add_time_limit_to_tasks

Revision ID: e3c4a2b16f89
Revises: 0b25027bb198
Create Date: 2026-06-09 08:39:50.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e3c4a2b16f89'
down_revision: Union[str, Sequence[str], None] = '0b25027bb198'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('tasks', sa.Column('time_limit', sa.Integer(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('tasks', 'time_limit')
