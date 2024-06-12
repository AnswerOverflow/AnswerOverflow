export async function First10Pokemon(){
    const response = await fetch('https://pokeapi.co/api/v2/pokemon?limit=10');
    const data = await response.json();
    return <div>{data.results.map((pokemon: any) => <div>{pokemon.name}</div>)}</div>;
}
