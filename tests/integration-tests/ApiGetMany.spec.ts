import { MakeMockClient } from "./utils/test-helpers";
import { GetMany } from "../../src/providers/queries";
import { ParsedRefDoc } from "../../src/misc/internal.models";

describe("api methods", () => {
  test("FireClient list docs", async () => {
    const client = MakeMockClient();
    const docIds = ["test123", "test22222", "asdads"];
    const collName = "list-mes";
    const collection = client.db().collection(collName);
    await Promise.all(
      docIds.map((id) => collection.doc(id).set({ title: "ee" }))
    );

    const result = await GetMany(
      collName,
      {
        ids: docIds.slice(1),
      },
      client
    );
    expect(result.data.length).toBe(2);
    expect(result.data[0]["id"]).toBe("test22222");
    expect(result.data[1]["id"]).toBe("asdads");
  }, 100000);

  test("FirebaseClient list docs from refs", async () => {
    const client = MakeMockClient();
    const docs = [
      {
        id: "11",
        name: "Albert",
      },
      {
        id: "22",
        name: "Stanburg",
      },
    ];
    const collName = "list-mes2";
    const db = client.db();
    await Promise.all(
      docs.map((user) =>
        db.doc(collName + "/" + user.id).set({ name: user.name })
      )
    );

    const result = await GetMany(
      collName,
      {
        ids: [
          {
            ___refid: '11',
            ___refpath: collName + "/" + '11',
          } as ParsedRefDoc as any
        ],
      },
      client
    );
    expect(result.data.length).toBe(2);
    expect(result.data[0]["id"]).toBe("11");
    expect(result.data[1]["id"]).toBe("22");
  }, 100000);
});
