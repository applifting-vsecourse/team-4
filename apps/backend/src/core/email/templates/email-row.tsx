import * as React from 'react';

/** A label and an amount of a payment summary; the total is `strong`. */
export const Row = ({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}): React.JSX.Element => (
  <table width="100%" role="presentation" cellPadding={0} cellSpacing={0}>
    <tbody>
      <tr>
        <td className="py-1 text-sm text-gray-500 align-top">{label}</td>
        <td
          className={`py-1 text-sm text-right align-top ${strong ? 'font-bold text-gray-900' : 'text-gray-900'}`}
        >
          {value}
        </td>
      </tr>
    </tbody>
  </table>
);
