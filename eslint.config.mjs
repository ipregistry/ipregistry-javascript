import eslint from '@eslint/js'
import prettier from 'eslint-config-prettier/flat'
import tseslint from 'typescript-eslint'

export default tseslint.config(
    eslint.configs.recommended,
    tseslint.configs.recommended,
    prettier,
    {
        rules: {
            '@typescript-eslint/no-explicit-any': 'off',
        },
    },
)
