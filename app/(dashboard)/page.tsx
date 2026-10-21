import Link from "next/link";

export default function Home() {
  return (
    <main>
      <h2>Dashboard</h2>
      <p>
        ソフトウェア開発におけるタスクの進捗状況をリアルタイムで可視化・管理するプラットフォームです。
        要件定義からテスト、リリースに至る各フェーズのタスクを管理し、ドラッグ＆ドロップでステータスを更新できます。担当者の自動割り当てや期限のアラート、進捗遅れを検知するダッシュボード機能を備え、チーム全体の業務効率化とプロジェクトの円滑な進行をサポートします。
      </p>

      <div className="flex justify-center my-8">
        <Link href="/tickets">
          <button className="btn-primary">View Tickets</button>
        </Link>
      </div>

      <h2>Company Updates</h2>

      <div className="card">
        <h3>Web開発チームに新しいメンバーが加わります</h3>
        <p>
          豊富なバックエンド開発実績を持つエンジニアの加入により、チームの技術力を強化します。また、新体制となったセキュリティ対策チームと協業体制となります。
        </p>
      </div>
      <div className="card">
        <h3>社内向けに新しいWebサイトがロンチされました！</h3>
        <p>
          社内の最新ニュースや業務マニュアル、各種申請フォームを一箇所に集約し、より使いやすくなりました。日々の業務効率化やメンバー間の情報共有に、ぜひご活用ください。
        </p>
      </div>
    </main>
  );
}
